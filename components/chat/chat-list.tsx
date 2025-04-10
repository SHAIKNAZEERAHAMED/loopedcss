"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ref, onValue, off } from "firebase/database"
import { db } from "../../lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { getUserProfile } from "@/lib/user-service"
import { safeGet } from "@/lib/db-helpers"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface ChatListProps {
  onSelectChat: (chatId: string, recipientId: string, recipientName: string) => void
}

interface ChatPreview {
  id: string
  recipientId: string
  recipientName: string
  recipientPhotoURL: string | null
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

export function ChatList({ onSelectChat }: ChatListProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return

    const userChatsRef = ref(db, `users/${user.uid}/chats`)

    const unsubscribe = onValue(userChatsRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setChats([])
        setLoading(false)
        return
      }

      try {
        const chatIds = Object.keys(snapshot.val())

        // Get chat details, recipients, and last messages
        const chatPreviews = await Promise.all(
          chatIds.map(async (chatId) => {
            const chatSnapshot = await safeGet(`chats/${chatId}`)

            if (!chatSnapshot.exists()) return null

            const chatData = chatSnapshot.val()
            const participants = chatData.participants || {}
            const recipientId = Object.keys(participants).find((id) => id !== user.uid)

            if (!recipientId) return null

            // Get recipient profile
            const recipientProfile = await getUserProfile(recipientId)

            if (!recipientProfile) return null

            // Get last message
            const messagesSnapshot = await safeGet(`chats/${chatId}/messages`)
            let lastMessage = "No messages yet"
            let lastMessageTime = new Date().toISOString()

            if (messagesSnapshot.exists()) {
              const messages = messagesSnapshot.val()
              const messageIds = Object.keys(messages)

              if (messageIds.length > 0) {
                // Sort by timestamp and get the last one
                messageIds.sort((a, b) => {
                  return new Date(messages[b].timestamp).getTime() - new Date(messages[a].timestamp).getTime()
                })

                const latestMessageId = messageIds[0]
                lastMessage = messages[latestMessageId].text
                lastMessageTime = messages[latestMessageId].timestamp
              }
            }

            // Get unread count
            const unreadSnapshot = await safeGet(`users/${user.uid}/chats/${chatId}/unreadCount`)
            const unreadCount = unreadSnapshot.exists() ? unreadSnapshot.val() : 0

            return {
              id: chatId,
              recipientId,
              recipientName: recipientProfile.displayName || "User",
              recipientPhotoURL: recipientProfile.photoURL,
              lastMessage,
              lastMessageTime,
              unreadCount,
            }
          }),
        )

        // Filter out null values (chats that couldn't be loaded)
        const validChats = chatPreviews.filter(Boolean) as ChatPreview[]

        // Sort by lastMessageTime (newest first)
        validChats.sort((a, b) => {
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        })

        setChats(validChats)
      } catch (error) {
        console.error("Error loading chats:", error)
      } finally {
        setLoading(false)
      }
    })

    return () => off(userChatsRef, "value", unsubscribe)
  }, [user?.uid])

  const handleStartNewChat = () => {
    router.push("/messages/new")
  }

  if (loading) {
    return (
      <div className="w-80 border-r h-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">Messages</h2>
          <Button variant="ghost" size="icon">
            <PlusCircle className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r h-full p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Messages</h2>
        <Button variant="ghost" size="icon" onClick={handleStartNewChat}>
          <PlusCircle className="h-5 w-5" />
        </Button>
      </div>

      {chats.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-4">No conversations yet</p>
          <Button onClick={handleStartNewChat}>Start a conversation</Button>
        </div>
      ) : (
        <div className="space-y-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className="flex items-center gap-3 p-2 w-full hover:bg-accent rounded-lg text-left"
              onClick={() => onSelectChat(chat.id, chat.recipientId, chat.recipientName)}
            >
              <Avatar>
                <AvatarImage src={chat.recipientPhotoURL || ""} />
                <AvatarFallback>{chat.recipientName.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between">
                  <p className="font-medium truncate">{chat.recipientName}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: true })}
                  </span>
                </div>

                <div className="flex gap-1 items-center">
                  <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>

                  {chat.unreadCount > 0 && (
                    <Badge className="ml-auto text-xs h-5 w-5 flex items-center justify-center p-0" variant="default">
                      {chat.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

