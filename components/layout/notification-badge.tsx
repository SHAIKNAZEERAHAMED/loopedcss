"use client"

import { useEffect, useState } from "react"
import { ref, onValue, off } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function NotificationBadge() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.uid) return

    const notificationsRef = ref(db, `users/${user.uid}/notifications`)

    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUnreadCount(0)
        return
      }

      let count = 0
      const notifications = snapshot.val()

      Object.values(notifications).forEach((notification: any) => {
        if (!notification.read) count++
      })

      setUnreadCount(count)
    })

    return () => off(notificationsRef, "value", unsubscribe)
  }, [user?.uid])

  return (
    <Link href="/notifications">
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            variant="destructive"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>
    </Link>
  )
}

