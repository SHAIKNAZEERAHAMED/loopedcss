"use client"

import { auth } from "@/lib/firebase/config"
import NotificationList from "@/components/notifications/notification-list"
import { redirect } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import AppShell from "@/components/layout/app-shell"
import { useEffect } from "react"

export default function NotificationsContent() {
  const [user, loading] = useAuthState(auth)

  useEffect(() => {
    if (!loading && !user) {
      redirect("/login")
    }
  }, [user, loading])

  if (loading) {
    return (
      <AppShell>
        <div className="container max-w-3xl py-6">
          <div className="flex items-center justify-center min-h-[200px]">
            Loading...
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container max-w-3xl py-6">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <NotificationList />
        </div>
      </div>
    </AppShell>
  )
} 