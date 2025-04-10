"use client"

import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Heart, MessageSquare, UserPlus } from "lucide-react"
import { getUserProfile } from "@/lib/user-service"
import { useEffect, useState } from "react"

interface NotificationItemProps {
  notification: {
    id: string
    type: "like" | "comment" | "follow" | "mention" | "system"
    senderId?: string
    postId?: string
    message: string
    read: boolean
    createdAt: string
  }
  onMarkAsRead: (id: string) => void
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const [senderName, setSenderName] = useState<string>("")
  const [senderPhoto, setSenderPhoto] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSenderInfo() {
      if (notification.senderId) {
        const user = await getUserProfile(notification.senderId)
        if (user) {
          setSenderName(user.displayName || "User")
          setSenderPhoto(user.photoURL)
        }
      }
    }

    fetchSenderInfo()
  }, [notification.senderId])

  function getNotificationIcon() {
    switch (notification.type) {
      case "like":
        return <Heart className="h-4 w-4 text-red-500" />
      case "comment":
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case "follow":
        return <UserPlus className="h-4 w-4 text-green-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  function getNotificationLink() {
    switch (notification.type) {
      case "like":
      case "comment":
        return notification.postId ? `/post/${notification.postId}` : "#"
      case "follow":
        return notification.senderId ? `/profile/${notification.senderId}` : "#"
      default:
        return "#"
    }
  }

  return (
    <Link
      href={getNotificationLink()}
      className={`flex items-center gap-4 p-4 hover:bg-gray-100 dark:hover:bg-gray-800 ${!notification.read ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={senderPhoto || ""} alt={senderName} />
        <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <p className="text-sm">
          <span className="font-bold">{senderName}</span> {notification.message}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      <div className="ml-2">{getNotificationIcon()}</div>
    </Link>
  )
}

