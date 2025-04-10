"use client"

import { useEffect, useState } from "react"
import NotificationItem from "./notification-item"
import { ref, onValue, update, off } from "firebase/database"
import { db } from "../../lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

export default function NotificationList() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return

    setLoading(true)
    const notificationsRef = ref(db, `users/${user.uid}/notifications`)

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const notificationsList = Object.entries(data).map(([id, notification]) => ({
          id,
          ...(notification as any),
        }))

        // Sort newest first
        notificationsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setNotifications(notificationsList)
      } else {
        setNotifications([])
      }
      setLoading(false)
    })

    return () => off(notificationsRef, "value", unsubscribe)
  }, [user?.uid])

  const handleMarkAsRead = async (id: string) => {
    if (!user?.uid) return

    await update(ref(db, `users/${user.uid}/notifications/${id}`), {
      read: true,
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onMarkAsRead={handleMarkAsRead} />
      ))}
    </div>
  )
}

