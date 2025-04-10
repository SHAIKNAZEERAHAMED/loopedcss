import type React from "react"
import { ProfileCompletionCheck } from "@/components/profile/profile-completion-check"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProfileCompletionCheck>
      <DashboardLayout>{children}</DashboardLayout>
    </ProfileCompletionCheck>
  )
}

