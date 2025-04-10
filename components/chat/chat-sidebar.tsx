"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/components/auth/auth-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Plus } from "lucide-react"

interface ChatData {
  id: string
  participants: string[]
  participantNames: Record<string, string>
  participantPhotos: Record<string, string>
  lastMessage: string
  lastMessageTime: any
  unreadCount: number
}

interface ChatSidebarProps {
  className?: string
  onSelectChat: (chatId: string) => void
}

export function ChatSidebar({ className = "", onSelectChat }: ChatSidebarProps) {
  const [chats, setChats] = useState<ChatData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const chatsQuery = query(collection(db, "chats"), orderBy("lastMessageTime", "desc"))

    // Real-time listener for chats
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const newChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatData[]

      // Filter chats where the current user is a participant
      const userChats = newChats.filter((chat) => chat.participants.includes(user.uid))

      // If no chats exist yet, create some sample chats
      if (userChats.length === 0) {
        setChats([
          {
            id: "1",
            participants: [user.uid, "user2"],
            participantNames: { user2: "Jane Smith" },
            participantPhotos: { user2: "" },
            lastMessage: "Hey, how are you doing?",
            lastMessageTime: { seconds: Date.now() / 1000 - 3600 },
            unreadCount: 2,
          },
          {
            id: "2",
            participants: [user.uid, "user3"],
            participantNames: { user3: "Alex Johnson" },
            participantPhotos: { user3: "" },
            lastMessage: "Did you see the latest post in Tech Loop?",
            lastMessageTime: { seconds: Date.now() / 1000 - 86400 },
            unreadCount: 0,
          },
          {
            id: "3",
            participants: [user.uid, "user4", "user5"],
            participantNames: { user4: "Sarah Williams", user5: "Mike Brown" },
            participantPhotos: { user4: "", user5: "" },
            lastMessage: "Let's meet up this weekend!",
            lastMessageTime: { seconds: Date.now() / 1000 - 172800 },
            unreadCount: 0,
          },
        ])
      } else {
        setChats(userChats)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true

    // Get other participants' names
    const otherParticipantNames = chat.participants
      .filter((id) => id !== user?.uid)
      .map((id) => chat.participantNames[id] || "")

    // Check if any name includes the search query
    return otherParticipantNames.some((name) => name.toLowerCase().includes(searchQuery.toLowerCase()))
  })

  return (
    <div className={`${className} flex flex-col`}>
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <Button variant="ghost" className="w-full justify-start mb-2 hover:bg-muted">
            <Plus className="h-4 w-4 mr-2 text-share" />
            <span>New Conversation</span>
          </Button>

          {loading ? (
            Array(3)
              .fill(0)
              .map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse mb-2" />)
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No conversations found</div>
          ) : (
            filteredChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                currentUserId={user?.uid || ""}
                onClick={() => onSelectChat(chat.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function ChatItem({
  chat,
  currentUserId,
  onClick,
}: {
  chat: ChatData
  currentUserId: string
  onClick: () => void
}) {
  // Get the other participants (not the current user)
  const otherParticipants = chat.participants.filter((id) => id !== currentUserId)

  // Get the name to display (for group chats, show first name + others)
  let displayName = ""
  if (otherParticipants.length === 1) {
    displayName = chat.participantNames[otherParticipants[0]] || "Unknown User"
  } else {
    const firstName = chat.participantNames[otherParticipants[0]] || "Unknown"
    displayName = `${firstName} & ${otherParticipants.length - 1} others`
  }

  // Get avatar for the first other participant
  const avatarUrl = otherParticipants.length > 0 ? chat.participantPhotos[otherParticipants[0]] : ""

  // Get initials for avatar fallback
  const initials = displayName
    .split(" ")
    .slice(0, 1)
    .map((name) => name[0])
    .join("")
    .toUpperCase()

  // Format time
  const time = chat.lastMessageTime?.seconds
    ? new Date(chat.lastMessageTime.seconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""

  return (
    <div className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors" onClick={onClick}>
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={avatarUrl} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center">
            <h3 className="font-medium truncate">{displayName}</h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
            {chat.unreadCount > 0 && (
              <span className="ml-2 bg-share text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                {chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

