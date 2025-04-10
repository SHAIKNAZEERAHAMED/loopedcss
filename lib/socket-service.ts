"use client"

import { io, type Socket } from "socket.io-client"
import { useEffect, useState } from "react"

let socket: Socket | null = null

export const initializeSocket = (userId: string) => {
  if (!process.env.NEXT_PUBLIC_SOCKET_URL) {
    console.warn("Socket URL not configured. Real-time features will be limited.")
    return null
  }

  if (socket && socket.connected) {
    return socket
  }

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth: {
      userId,
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on("connect", () => {
    console.log("Socket connected")
  })

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error)
  })

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason)
  })

  return socket
}

export const getSocket = () => socket

export const closeSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const useSocket = (userId: string | undefined) => {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!userId) return

    const socket = initializeSocket(userId)

    if (!socket) return

    const onConnect = () => {
      setIsConnected(true)
    }

    const onDisconnect = () => {
      setIsConnected(false)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)

    // Set initial state
    setIsConnected(socket.connected)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
    }
  }, [userId])

  return { socket: getSocket(), isConnected }
}

// Notification types
export interface NotificationPayload {
  id: string
  type: "like" | "comment" | "follow" | "mention" | "system"
  senderId?: string
  senderName?: string
  senderPhoto?: string
  postId?: string
  message: string
  createdAt: string
}

// Chat message types
export interface MessagePayload {
  id: string
  chatId: string
  senderId: string
  text: string
  timestamp: string
  read: boolean
  participants?: string[]
  mediaURL?: string
  mediaType?: "image" | "file"
}

// Typing indicator types
export interface TypingPayload {
  chatId: string
  userId: string
  isTyping: boolean
}

// Post update types
export interface PostUpdatePayload {
  postId: string
  action: "create" | "update" | "delete" | "like" | "unlike" | "comment"
  data: any
}

// User presence types
export interface PresencePayload {
  userId: string
  status: "online" | "offline" | "away"
  lastActive: string
}

// Socket event emitters
export const emitNotification = (notification: NotificationPayload) => {
  if (!socket || !socket.connected) return
  socket.emit("notification", notification)
}

export const emitMessage = (message: MessagePayload) => {
  if (!socket || !socket.connected) return
  socket.emit("message", message)
}

export const emitTyping = (typing: TypingPayload) => {
  if (!socket || !socket.connected) return
  socket.emit("typing", typing)
}

export const emitPostUpdate = (update: PostUpdatePayload) => {
  if (!socket || !socket.connected) return
  socket.emit("post_update", update)
}

export const emitPresence = (presence: PresencePayload) => {
  if (!socket || !socket.connected) return
  socket.emit("presence", presence)
}

// Join a room (for chat, post comments, etc.)
export const joinRoom = (roomId: string) => {
  if (!socket || !socket.connected) return
  socket.emit("join_room", roomId)
}

// Leave a room
export const leaveRoom = (roomId: string) => {
  if (!socket || !socket.connected) return
  socket.emit("leave_room", roomId)
}

