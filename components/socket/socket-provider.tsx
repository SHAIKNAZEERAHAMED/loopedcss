"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { io } from "socket.io-client"

interface SocketContextType {
  socket: any | null
  isConnected: boolean
  joinChat: (chatId: string) => void
  leaveChat: (chatId: string) => void
  sendMessage: (message: any) => void
  setTyping: (chatId: string, isTyping: boolean) => void
  markAsRead: (chatId: string, messageIds: string[]) => void
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinChat: () => {},
  leaveChat: () => {},
  sendMessage: () => {},
  setTyping: () => {},
  markAsRead: () => {},
})

export const useSocket = () => useContext(SocketContext)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<any | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "", {
      path: "/api/socket/io",
      addTrailingSlash: false,
    })

    newSocket.on("connect", () => {
      setIsConnected(true)
    })

    newSocket.on("disconnect", () => {
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.off("connect")
      newSocket.off("disconnect")
      newSocket.disconnect()
    }
  }, [])

  const joinChat = useCallback(
    (chatId: string) => {
      socket?.emit("join-chat", chatId)
    },
    [socket],
  )

  const leaveChat = useCallback(
    (chatId: string) => {
      socket?.emit("leave-chat", chatId)
    },
    [socket],
  )

  const sendMessage = useCallback(
    (message: any) => {
      socket?.emit("send-message", message)
    },
    [socket],
  )

  const setTyping = useCallback(
    (chatId: string, isTyping: boolean) => {
      socket?.emit("typing", { chatId, isTyping })
    },
    [socket],
  )

  const markAsRead = useCallback(
    (chatId: string, messageIds: string[]) => {
      socket?.emit("mark-as-read", { chatId, messageIds })
    },
    [socket],
  )

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinChat,
        leaveChat,
        sendMessage,
        setTyping,
        markAsRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

