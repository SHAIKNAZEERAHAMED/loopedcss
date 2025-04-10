"use client"

import { useState } from "react"
import { ChatList } from "@/components/chat/chat-list"
import { ChatWindow } from "@/components/chat/chat-window"
import { OnlineUsers } from "@/components/chat/online-users"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { PlusCircle, Users } from "lucide-react"

export default function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Chat List Sidebar */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Messages</h2>
            <Button variant="ghost" size="icon">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatList
              onSelectChat={(chatId) => setSelectedChatId(chatId)}
              selectedChatId={selectedChatId || undefined}
            />
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1">
          {selectedChatId ? (
            <ChatWindow chatId={selectedChatId} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center p-8">
                <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">Choose a conversation from the sidebar or start a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* Online Users Sidebar */}
        <div className="w-64 border-l hidden lg:block">
          <div className="p-4 border-b flex items-center gap-2">
            <Users className="h-5 w-5 text-connect" />
            <h2 className="font-semibold">Online</h2>
          </div>
          <div className="h-[calc(100%-57px)]">
            <OnlineUsers />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

