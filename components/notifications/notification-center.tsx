"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/contexts/auth-context"
import { ref, onValue, off, update } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useSocket } from "@/lib/socket-service"
import { useToast } from "@/components/ui/use-toast"

interface Notification {
  id: string
  type: "like" | "comment" | "follow" | "mention" | "system"
  senderId?: string
  senderName?: string
  senderPhoto?: string
  postId?: string
  message: string
  read: boolean
  createdAt: string
}

export function NotificationCenter() {
  const { user } = useAuth()
  const { socket, isConnected } = useSocket(user?.uid)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio("/sounds/notification.mp3")
    }
  }, [])

  useEffect(() => {
    if (!user?.uid) return

    // Subscribe to notifications from Firebase
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

        // Count unread notifications
        const unread = notificationsList.filter((n) => !n.read).length
        setUnreadCount(unread)
      } else {
        setNotifications([])
        setUnreadCount(0)
      }
      setLoading(false)
    })

    return () => off(notificationsRef, "value", unsubscribe)
  }, [user?.uid])

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!socket || !user?.uid) return

    const handleNewNotification = (notification: Notification) => {
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch((err) => console.error("Error playing notification sound:", err))
      }

      // Show toast notification
      toast({
        title: notification.type.charAt(0).toUpperCase() + notification.type.slice(1),
        description: notification.message,
        duration: 5000,
      })

      // Update notifications state
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)
    }

    socket.on("notification", handleNewNotification)

    return () => {
      socket.off("notification", handleNewNotification)
    }
  }, [socket, user?.uid, toast])

  const handleMarkAsRead = async (id: string) => {
    if (!user?.uid) return

    await update(ref(db, `users/${user.uid}/notifications/${id}`), {
      read: true,
    })

    // Update local state
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(prev - 1, 0))
  }

  const handleMarkAllAsRead = async () => {
    if (!user?.uid || notifications.length === 0) return

    const updates: Record<string, any> = {}

    notifications.forEach((notification) => {
      if (!notification.read) {
        updates[`users/${user.uid}/notifications/${notification.id}/read`] = true
      }
    })

    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates)

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <div className="h-2 w-2 rounded-full bg-red-500" />
      case "comment":
        return <div className="h-2 w-2 rounded-full bg-blue-500" />
      case "follow":
        return <div className="h-2 w-2 rounded-full bg-green-500" />
      case "mention":
        return <div className="h-2 w-2 rounded-full bg-purple-500" />
      default:
        return <div className="h-2 w-2 rounded-full bg-gray-500" />
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions">Mentions</TabsTrigger>
          </TabsList>

          <div className="max-h-[300px] overflow-y-auto">
            <TabsContent value="all" className="m-0">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-accent ${!notification.read ? "bg-accent/30" : ""}`}
                    >
                      <Link
                        href={notification.postId ? `/post/${notification.postId}` : "#"}
                        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                        className="flex items-start gap-3"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={notification.senderPhoto || ""} />
                          <AvatarFallback>{notification.senderName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">{notification.senderName || "Someone"}</span>{" "}
                            {notification.message}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {getNotificationIcon(notification.type)}
                              {notification.type}
                            </span>
                            <span className="mx-1">•</span>
                            <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="unread" className="m-0">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.filter((n) => !n.read).length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No unread notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications
                    .filter((n) => !n.read)
                    .map((notification) => (
                      <div key={notification.id} className="p-3 hover:bg-accent bg-accent/30">
                        <Link
                          href={notification.postId ? `/post/${notification.postId}` : "#"}
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="flex items-start gap-3"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={notification.senderPhoto || ""} />
                            <AvatarFallback>{notification.senderName?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">{notification.senderName || "Someone"}</span>{" "}
                              {notification.message}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {getNotificationIcon(notification.type)}
                                {notification.type}
                              </span>
                              <span className="mx-1">•</span>
                              <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="mentions" className="m-0">
              {loading ? (
                <div className="space-y-2 p-2">
                  <div className="flex items-center gap-2 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ) : notifications.filter((n) => n.type === "mention").length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No mentions yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications
                    .filter((n) => n.type === "mention")
                    .map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-accent ${!notification.read ? "bg-accent/30" : ""}`}
                      >
                        <Link
                          href={notification.postId ? `/post/${notification.postId}` : "#"}
                          onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                          className="flex items-start gap-3"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={notification.senderPhoto || ""} />
                            <AvatarFallback>{notification.senderName?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1 space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">{notification.senderName || "Someone"}</span>{" "}
                              {notification.message}
                            </p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                {getNotificationIcon(notification.type)}
                                {notification.type}
                              </span>
                              <span className="mx-1">•</span>
                              <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="p-2 border-t text-center">
          <Link href="/notifications" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}

