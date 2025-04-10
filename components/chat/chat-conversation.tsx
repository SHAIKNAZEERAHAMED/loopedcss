"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, ImageIcon, Smile, Paperclip } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ref, onValue, off, update, push } from "firebase/database"
import { db, storage } from "@/lib/firebase/config"
import { getUser } from "@/lib/user-service"
import { useSocket, joinRoom, leaveRoom, emitMessage, emitTyping } from "@/lib/socket-service"
import { Skeleton } from "@/components/ui/skeleton"
import EmojiPicker from "emoji-picker-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"

interface ChatConversationProps {
  chatId: string
  recipientId: string
}

interface Message {
  id: string
  senderId: string
  text: string
  timestamp: string
  read: boolean
  mediaURL?: string
  mediaType?: "image" | "file"
}

export function ChatConversation({ chatId, recipientId }: ChatConversationProps) {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket(user?.uid)
  const [messages, setMessages] = useState<Message[]>([])
  const [recipient, setRecipient] = useState<any>(null)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [recipientTyping, setRecipientTyping] = useState(false)
  const [recipientTypingTimeout, setRecipientTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch recipient profile
  useEffect(() => {
    async function fetchRecipient() {
      if (!recipientId) return
      
      try {
        const recipientData = await getUser(recipientId)
        setRecipient(recipientData)
      } catch (error) {
        console.error('Error fetching recipient:', error)
      }
    }
    
    fetchRecipient()
  }, [recipientId])

  // Fetch messages and subscribe to updates
  useEffect(() => {
    if (!chatId || !user?.uid) return
    
    // Join the chat room for socket updates
    joinRoom(`chat:${chatId}`)
    
    const messagesRef = ref(db, `chats/${chatId}/messages`)
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = snapshot.val()
        const messagesList = Object.entries(messagesData).map(([id, message]) => ({
          id,
          ...message as any,
        }))
        
        // Sort by timestamp
        messagesList.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        
        setMessages(messagesList)
        
        // Mark messages as read
        const updates: Record<string, any> = {}
        
        messagesList.forEach(message => {
          if (message.senderId !== user.uid && !message.read) {
            updates[`chats/${chatId}/messages/${message.id}/read`] = true
          }
        })
        
        if (Object.keys(updates).length > 0) {
          update(ref(db), updates)
          
          // Reset unread count for this chat
          update(ref(db, `users/${user.uid}/chats/${chatId}`), {
            unreadCount: 0,
            lastRead: new Date().toISOString()
          })
        }
      } else {
        setMessages([])
      }
      
      setLoading(false)
    })
    
    return () => {
      off(messagesRef, 'value', unsubscribe)
      leaveRoom(`chat:${chatId}`)
    }
  }, [chatId, user?.uid])

  // Listen for real-time messages via socket
  useEffect(() => {
    if (!socket || !chatId) return

    const handleNewMessage = (message: Message) => {
      if (message.senderId !== user?.uid) {
        // Update messages state
        setMessages(prev => [...prev, message])
        
        // Mark message as read in the database
        update(ref(db, `chats/${chatId}/messages/${message.id}`), {
          read: true
        })
      }
    }

    socket.on('message', handleNewMessage)

    return () => {
      socket.off('message', handleNewMessage)
    }
  }, [socket, chatId, user?.uid])

  // Listen for typing indicators
  useEffect(() => {
    if (!socket || !chatId) return

    const handleTyping = (data: { chatId: string, userId: string, isTyping: boolean }) => {
      if (data.chatId === chatId && data.userId === recipientId) {
        setRecipientTyping(data.isTyping)
        
        // Clear previous timeout
        if (recipientTypingTimeout) {
          clearTimeout(recipientTypingTimeout)
        }
        
        // Set a timeout to clear typing indicator after 3 seconds
        if (data.isTyping) {
          const timeout = setTimeout(() => {
            setRecipientTyping(false)
          }, 3000)
          
          setRecipientTypingTimeout(timeout)
        }
      }
    }

    socket.on('typing', handleTyping)

    return () => {
      socket.off('typing', handleTyping)
      
      if (recipientTypingTimeout) {
        clearTimeout(recipientTypingTimeout)
      }
    }
  }, [socket, chatId, recipientId, recipientTypingTimeout])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    
    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true)
      emitTyping({ chatId, userId: user?.uid || '', isTyping: true })
    }
    
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
    
    // Set a timeout to clear typing indicator after 2 seconds of inactivity
    const timeout = setTimeout(() => {
      setIsTyping(false)
      emitTyping({ chatId, userId: user?.uid || '', isTyping: false })
    }, 2000)
    
    setTypingTimeout(timeout)
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !uploading) return
    if (!user?.uid || !chatId) return
    
    try {
      const timestamp = new Date().toISOString()
      
      // Create message in database
      const newMessageRef = push(ref(db, `chats/${chatId}/messages`))
      
      const messageData = {
        senderId: user.uid,
        text: inputValue.trim(),
        timestamp,
        read: false
      }
      
      await update(newMessageRef, messageData)
      
      // Update last message in chat
      await update(ref(db, `chats/${chatId}`), {
        lastMessage: inputValue.trim(),
        lastMessageTime: timestamp,
        lastMessageSender: user.uid
      })
      
      // Update unread count for recipient
      const recipientChatRef = ref(db, `users/${recipientId}/chats/${chatId}`)
      const unsubscribe = onValue(recipientChatRef, (snapshot) => {
        if (snapshot.exists()) {
          const chatData = snapshot.val()
          const currentUnread = chatData.unreadCount || 0
          
          update(recipientChatRef, {
            unreadCount: currentUnread + 1
          })
        }
        
        // Only need to do this once
        unsubscribe()
      })
      
      // Emit message via socket
      emitMessage({
        id: newMessageRef.key as string,
        chatId,
        senderId: user.uid,
        text: inputValue.trim(),
        timestamp,
        read: false,
        participants: [user.uid, recipientId]
      })
      
      // Clear input
      setInputValue('')
      
      // Clear typing indicator
      setIsTyping(false)
      emitTyping({ chatId, userId: user.uid, isTyping: false })
      
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleEmojiSelect = (emoji: any) => {
    setInputValue(prev => prev + emoji.emoji)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user?.uid || !chatId) return
    
    const file = e.target.files[0]
    setUploading(true)
    
    try {
      // Upload file to storage
      const fileId = uuidv4()
      const fileExtension = file.name.split('.').pop()
      const fileName = `chat_${chatId}_${fileId}.${fileExtension}`
      const fileRef = storageRef(storage, `chats/${chatId}/${fileName}`)
      
      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)
      
      // Create message with media
      const timestamp = new Date().toISOString()
      const newMessageRef = push(ref(db, `chats/${chatId}/messages`))
      
      const isImage = file.type.startsWith('image/')
      
      const messageData = {
        senderId: user.uid,
        text: isImage ? '📷 Image' : `📎 ${file.name}`,
        timestamp,
        read: false,
        mediaURL: downloadURL,
        mediaType: isImage ? 'image' : 'file'
      }
      
      await update(newMessageRef, messageData)
      
      // Update last message in chat
      await update(ref(db, `chats/${chatId}`), {
        lastMessage: isImage ? '📷 Image' : `📎 File`,
        lastMessageTime: timestamp,
        lastMessageSender: user.uid
      })
      
      // Update unread count for recipient
      const recipientChatRef = ref(db, `users/${recipientId}/chats/${chatId}`)
      const unsubscribe = onValue(recipientChatRef, (snapshot) => {
        if (snapshot.exists()) {
          const chatData = snapshot.val()
          const currentUnread = chatData.unreadCount || 0
          
          update(recipientChatRef, {
            unreadCount: currentUnread + 1
          })
        }
        
        // Only need to do this once
        unsubscribe()
      })
      
      // Emit message via socket
      emitMessage({
        id: newMessageRef.key as string,
        chatId,
        senderId: user.uid,
        text: isImage ? '📷 Image' : `📎 ${file.name}`,
        timestamp,
        read: false,
        mediaURL: downloadURL,
        mediaType: isImage ? 'image' : 'file',
        participants: [user.uid, recipientId]
      })
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="border-b p-3 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex items-start gap-2 ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
              <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-64' : 'w-48'} rounded-lg`} />
            </div>
          ))}
        </div>
        
        <div className="border-t p-3">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b p-3 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={recipient?.photoURL || ''} />
          <AvatarFallback>{recipient?.displayName?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{recipient?.displayName || 'User'}</h3>
          <p className="text-xs text-muted-foreground">
            {recipient?.status?.state === 'online' ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwnMessage = message.senderId === user?.uid
              
              return (
                <div 
                  key={message.id}
                  className={`flex items-start gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={recipient?.photoURL || ''} />
                      <AvatarFallback>{recipient?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[70%] ${isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                    {message.mediaURL && message.mediaType === 'image' ? (
                      <img 
                        src={message.mediaURL || "/placeholder.svg"} 
                        alt="Shared image" 
                        className="rounded-md mb-2 max-w-full"
                        onClick={() => window.open(message.mediaURL, '_blank')}
                      />
                    ) : message.mediaURL && message.mediaType === 'file' ? (
                      <a 
                        href={message.mediaURL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        {message.text.replace('📎 ', '')}
                      </a>
                    ) : (
                      <p>{message.text}</p>
                    )}
                    
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-xs opacity-70">
                        {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                      </span>
                      {isOwnMessage && (
                        <span className="text-xs opacity-70">
                          {message.read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {recipientTyping && (
              <div className="flex items-start gap-2 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={recipient?.photoURL || ''} />
                  <AvatarFallback>{recipient?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex gap-1">
                    <span className="animate-bounce">•</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>•</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>•</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileUpload}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-none">
              <EmojiPicker onEmojiClick={handleEmojiSelect} />
            </PopoverContent>
          </Popover>
          
          <Input
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={uploading}
            className="flex-1"
          />
          
          <Button 
            variant="default" 
            size="icon" 
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && !uploading) || uploading}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

