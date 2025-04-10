"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { HomeContent } from "@/components/home/home-content"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Icons } from "@/components/ui/icons"

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.spinner className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!user) {
    router.push("/")
    return null
  }

  return (
    <DashboardLayout>
      <HomeContent />
    </DashboardLayout>
  )
} 