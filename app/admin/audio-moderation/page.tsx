import type { Metadata } from "next"
import { getAuth } from "firebase/auth"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AudioModerationPanel } from "@/components/admin/audio-moderation-panel"

export const metadata: Metadata = {
  title: "Audio Moderation | Loop(CSS)",
  description: "Monitor and manage audio content moderation",
}

export default async function AudioModerationPage() {
  const auth = getAuth()
  const user = auth.currentUser

  if (!user) {
    redirect("/login")
  }

  // Check for admin role - this would be expanded in a real app
  const isAdmin = user.email === "admin@example.com"

  if (!isAdmin) {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <div className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Audio Content Moderation</h1>
        <AudioModerationPanel />
      </div>
    </DashboardLayout>
  )
}

