"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ref, onValue, off, set, get, serverTimestamp } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { safePush, safeSet } from "@/lib/db-helpers"
import { Skeleton } from "@/components/ui/skeleton"

interface User {
  id: string
  displayName: string
  photoURL: string | null
  lastActive: number
}

export function OnlineUsers() {
  const { user } = useAuth()
  const router = useRouter()
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return

    // Update user's online status
    const userStatusRef = ref(db, `users/${user.uid}/status`)

    // Set user as online when component mounts
    const setUserOnline = async () => {
      await safeSet(`users/${user.uid}/status`, {
        state: "online",
        lastActive: serverTimestamp(),
      })
    }

    setUserOnline()

    // Listen for online users
    const usersRef = ref(db, "users")

    const unsubscribe = onValue(usersRef, async (snapshot) => {
      if (!snapshot.exists()) {
        setOnlineUsers([])
        setLoading(false)
        return
      }

      const users = snapshot.val()
      const now = Date.now()
      const activeUsers: User[] = []

      // Consider a user online if they have been active in the last 5 minutes
      const onlineThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds

      for (const userId in users) {
        // Skip the current user
        if (userId === user.uid) continue

        const userData = users[userId]

        if (userData.status) {
          const lastActive = userData.status.lastActive

          if (userData.status.state === "online" || (lastActive && now - lastActive < onlineThreshold)) {
            activeUsers.push({
              id: userId,
              displayName: userData.displayName || "User",
              photoURL: userData.photoURL || null,
              lastActive: lastActive || now,
            })
          }
        }
      }

      // Sort by displayName
      activeUsers.sort((a, b) => {
        return a.displayName.localeCompare(b.displayName)
      })

      setOnlineUsers(activeUsers)
      setLoading(false)
    })

    // Set user as offline when component unmounts
    const setUserOffline = () => {
      set(userStatusRef, {
        state: "offline",
        lastActive: serverTimestamp(),
      })
    }

    // Set up event listeners for when the user becomes inactive
    window.addEventListener("beforeunload", setUserOffline)

    return () => {
      off(usersRef, "value", unsubscribe)
      window.removeEventListener("beforeunload", setUserOffline)
      setUserOffline()
    }
  }, [user?.uid])

  const startChat = async (otherUserId: string) => {
    if (!user?.uid) return

    try {
      // Check if a chat already exists between these users
      const userChatsRef = ref(db, `users/${user.uid}/chats`)
      const snapshot = await get(userChatsRef)

      if (snapshot.exists()) {
        const chats = snapshot.val()

        // Look for a chat where the other user is a participant
        for (const chatId in chats) {
          const chatRef = ref(db, `chats/${chatId}/participants/${otherUserId}`)
          const participantSnapshot = await get(chatRef)

          if (participantSnapshot.exists()) {
            // Chat exists, navigate to it
            router.push(`/messages/${chatId}`)
            return
          }
        }
      }

      // Create a new chat if none exists
      const newChatRef = await safePush("chats", {
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        participants: {
          [user.uid]: true,
          [otherUserId]: true,
        },
      })

      const chatId = newChatRef.key

      // Add chat reference to both users
      await safeSet(`users/${user.uid}/chats/${chatId}`, {
        lastRead: new Date().toISOString(),
        unreadCount: 0,
      })

      await safeSet(`users/${otherUserId}/chats/${chatId}`, {
        lastRead: new Date().toISOString(),
        unreadCount: 0,
      })

      // Navigate to the new chat
      router.push(`/messages/${chatId}`)
    } catch (error) {
      console.error("Error starting chat:", error)
    }
  }

  if (loading) {
    return (
      <div className="w-64 p-4 border-l">
        <h2 className="font-semibold mb-4">Online Users</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 p-4 border-l">
      <h2 className="font-semibold mb-4">Online Users</h2>

      {onlineUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users online right now.</p>
      ) : (
        <ul className="space-y-2">
          {onlineUsers.map((user) => (
            <li key={user.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ""} />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-1 ring-white" />
                </span>
                <span className="text-sm">{user.displayName}</span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => startChat(user.id)}
                title="Message user"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

