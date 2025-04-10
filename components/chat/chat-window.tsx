"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { collection, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/components/auth/auth-provider"
import { useSocket } from "@/components/socket/socket-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { moderateContent } from "@/lib/ai-moderation"
import { Send, Image, Smile, Paperclip, MoreVertical, Phone, Video, Check, CheckCheck } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: any
  isSafe: boolean
  status?: "sent" | "delivered" | "read"
}

interface ChatParticipant {
  id: string
  name: string
  photoURL?: string
  status?: "online" | "offline" | "away"
  lastActive?: any
  isTyping?: boolean
}

interface ChatWindowProps {
  chatId: string
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [chatInfo, setChatInfo] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const [participants, setParticipants] = useState<ChatParticipant[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const { user } = useAuth()
  const { socket, isConnected, joinChat, leaveChat, sendMessage, setTyping, markAsRead } = useSocket()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastReadMessageRef = useRef<string | null>(null)

  // Join chat room when component mounts
  useEffect(() => {
    if (!user || !chatId || !isConnected) return

    joinChat(chatId)

    return () => {
      leaveChat(chatId)
    }
  }, [user, chatId, isConnected, joinChat, leaveChat])

  // Listen for socket events
  useEffect(() => {
    if (!socket || !user) return

    // Handle new messages from socket
    const handleNewMessage = (message: any) => {
      if (message.chatId === chatId && message.senderId !== user.uid) {
        // Mark message as delivered
        socket.emit("message-delivered", {
          chatId,
          messageId: message.id,
          userId: user.uid,
        })

        // Update messages with the new one
        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some((m) => m.id === message.id)
          if (exists) return prev

          return [...prev, { ...message, status: "delivered" }]
        })

        // Mark as read if window is focused
        if (document.hasFocus()) {
          markAsRead(chatId, [message.id])
        }
      }
    }

    // Handle typing indicators
    const handleUserTyping = (data: { chatId: string; userId: string; isTyping: boolean }) => {
      if (data.chatId === chatId && data.userId !== user.uid) {
        setTypingUsers((prev) => {
          if (data.isTyping && !prev.includes(data.userId)) {
            return [...prev, data.userId]
          } else if (!data.isTyping && prev.includes(data.userId)) {
            return prev.filter((id) => id !== data.userId)
          }
          return prev
        })
      }
    }

    // Handle read receipts
    const handleMessagesRead = (data: { chatId: string; userId: string; messageIds: string[] }) => {
      if (data.chatId === chatId && data.userId !== user.uid) {
        setMessages((prev) =>
          prev.map((message) =>
            data.messageIds.includes(message.id) && message.senderId === user.uid
              ? { ...message, status: "read" }
              : message,
          ),
        )
      }
    }

    // Handle user presence updates
    const handlePresenceUpdate = (data: { userId: string; status: "online" | "offline" | "away" }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === data.userId ? { ...p, status: data.status, lastActive: new Date() } : p)),
      )
    }

    // Handle user joined notification
    const handleUserJoined = (data: { userId: string; timestamp: number }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === data.userId ? { ...p, status: "online", lastActive: new Date(data.timestamp) } : p)),
      )
    }

    // Handle user left notification
    const handleUserLeft = (data: { userId: string; timestamp: number }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === data.userId ? { ...p, status: "offline", lastActive: new Date(data.timestamp) } : p)),
      )
    }

    // Register event listeners
    socket.on("new-message", handleNewMessage)
    socket.on("user-typing", handleUserTyping)
    socket.on("messages-read", handleMessagesRead)
    socket.on("presence-update", handlePresenceUpdate)
    socket.on("user-joined", handleUserJoined)
    socket.on("user-left", handleUserLeft)

    // Clean up event listeners
    return () => {
      socket.off("new-message", handleNewMessage)
      socket.off("user-typing", handleUserTyping)
      socket.off("messages-read", handleMessagesRead)
      socket.off("presence-update", handlePresenceUpdate)
      socket.off("user-joined", handleUserJoined)
      socket.off("user-left", handleUserLeft)
    }
  }, [socket, user, chatId, markAsRead])

  // Load chat data and messages from Firestore
  useEffect(() => {
    if (!user || !chatId) return

    // Get chat info
    const chatDocRef = doc(db, "chats", chatId)
    const unsubscribeChat = onSnapshot(chatDocRef, (doc) => {
      if (doc.exists()) {
        const chatData = doc.data()
        setChatInfo(chatData)

        // Mark messages as read
        updateDoc(chatDocRef, {
          [`unreadCount.${user.uid}`]: 0,
        }).catch((err) => console.error("Error updating read status:", err))
      }
    })

    // Get messages
    const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"))

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[]

      // If no messages exist yet, create some sample messages
      if (newMessages.length === 0) {
        setMessages([
          {
            id: "1",
            content: "Hey there! How are you?",
            senderId: "user2",
            senderName: "Jane Smith",
            timestamp: { seconds: Date.now() / 1000 - 3600 },
            isSafe: true,
            status: "read",
          },
          {
            id: "2",
            content: "I'm doing great! Just checking out the new Loop(CSS) platform.",
            senderId: user.uid,
            senderName: user.displayName || "You",
            timestamp: { seconds: Date.now() / 1000 - 3500 },
            isSafe: true,
            status: "read",
          },
          {
            id: "3",
            content: "It looks amazing! I love the real-time features.",
            senderId: "user2",
            senderName: "Jane Smith",
            timestamp: { seconds: Date.now() / 1000 - 3400 },
            isSafe: true,
            status: "delivered",
          },
        ])
      } else {
        setMessages(newMessages)
      }

      setLoading(false)
    })

    // Get participants
    const fetchParticipants = async () => {
      try {
        const chatDoc = await doc(db, "chats", chatId).get()
        const chatData = chatDoc.data()

        if (chatData?.participants) {
          const participantIds = chatData.participants
          const participantsData: ChatParticipant[] = []

          for (const id of participantIds) {
            const userDoc = await doc(db, "users", id).get()
            const userData = userDoc.data()

            if (userData) {
              participantsData.push({
                id,
                name: userData.displayName || "Unknown User",
                photoURL: userData.photoURL,
                status: "offline",
                lastActive: userData.lastActive,
              })
            }
          }

          setParticipants(participantsData)
        }
      } catch (error) {
        console.error("Error fetching participants:", error)
      }
    }

    fetchParticipants()

    return () => {
      unsubscribeChat()
      unsubscribeMessages()
    }
  }, [user, chatId])

  // Mark messages as read when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (messages.length > 0 && user) {
        const unreadMessages = messages.filter((m) => m.senderId !== user.uid && m.status !== "read").map((m) => m.id)

        if (unreadMessages.length > 0) {
          markAsRead(chatId, unreadMessages)
        }
      }
    }

    window.addEventListener("focus", handleFocus)

    return () => {
      window.removeEventListener("focus", handleFocus)
    }
  }, [messages, user, chatId, markAsRead])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

    // Mark new messages as read if they're visible
    if (document.hasFocus() && messages.length > 0 && user) {
      const lastMessage = messages[messages.length - 1]

      if (lastMessage.senderId !== user.uid && lastMessage.id !== lastReadMessageRef.current) {
        markAsRead(chatId, [lastMessage.id])
        lastReadMessageRef.current = lastMessage.id
      }
    }
  }, [messages, user, chatId, markAsRead])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user || sending) return

    setSending(true)
    try {
      // Moderate content before sending
      const moderationResult = await moderateContent(newMessage)

      // Create message object
      const messageData = {
        content: newMessage,
        senderId: user.uid,
        senderName: user.displayName,
        timestamp: serverTimestamp(),
        isSafe: moderationResult.isSafe,
        status: "sent",
      }

      // Add message to Firestore
      const messageRef = await addDoc(collection(db, "chats", chatId, "messages"), messageData)

      // Get the message ID
      const messageWithId = {
        ...messageData,
        id: messageRef.id,
        chatId,
        timestamp: { seconds: Date.now() / 1000 },
      }

      // Send message via socket
      sendMessage(messageWithId)

      // Update last message in chat document
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: newMessage,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${user.uid}`]: 0,
      })

      // Clear typing indicator
      setTyping(chatId, false)

      setNewMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  const handleTyping = () => {
    if (!user || !chatId) return

    // Send typing indicator via socket
    setTyping(chatId, true)

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to clear typing status
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(chatId, false)
    }, 3000)
  }

  // Get other participants (not the current user)
  const otherParticipants = participants.filter((p) => p.id !== user?.uid)

  // Get the name to display
  let chatName = ""
  if (otherParticipants.length === 1) {
    chatName = otherParticipants[0].name || "Chat"
  } else if (otherParticipants.length > 1) {
    const names = otherParticipants.map((p) => p.name || "Unknown")
    chatName = `${names[0]} & ${otherParticipants.length - 1} others`
  }

  // Get online status
  const isOnline = otherParticipants.some((p) => p.status === "online")
  const isTypingUser = typingUsers.some((id) => otherParticipants.some((p) => p.id === id))

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar>
              <AvatarImage src={otherParticipants[0]?.photoURL || ""} />
              <AvatarFallback>{chatName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></span>
            )}
          </div>
          <div>
            <h2 className="font-medium">{chatName}</h2>
            <p className="text-xs text-muted-foreground">
              {isTypingUser ? <span className="text-share">Typing...</span> : isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} isCurrentUser={message.senderId === user?.uid} />
            ))}
          </AnimatePresence>

          {isTypingUser && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-end gap-2 max-w-[80%]">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{chatName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="rounded-lg p-3 bg-muted">
                  <div className="flex gap-1">
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"
                      style={{ animationDelay: "600ms" }}
                    ></span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon">
            <Image className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon">
            <Smile className="h-5 w-5" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value)
              handleTyping()
            }}
            className="flex-1"
          />
          <Button type="submit" className="share-bg hover:bg-opacity-90" disabled={!newMessage.trim() || sending}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  isCurrentUser,
}: {
  message: Message
  isCurrentUser: boolean
}) {
  // Format time
  const time = message.timestamp?.seconds
    ? new Date(message.timestamp.seconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
    >
      <div className="flex items-end gap-2 max-w-[80%]">
        {!isCurrentUser && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>{message.senderName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <div>
          {!isCurrentUser && <p className="text-xs text-muted-foreground ml-2 mb-1">{message.senderName}</p>}
          <div className={`rounded-lg p-3 ${isCurrentUser ? "bg-share text-white" : "bg-muted"}`}>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            <p className="text-xs text-muted-foreground">{time}</p>
            {isCurrentUser && message.status && (
              <span className="text-xs text-muted-foreground">
                {message.status === "sent" && <Check className="h-3 w-3" />}
                {message.status === "delivered" && <CheckCheck className="h-3 w-3" />}
                {message.status === "read" && <CheckCheck className="h-3 w-3 text-share" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

