import { AdvancedModerationDashboard } from "@/components/admin/advanced-moderation-dashboard"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Advanced Moderation Dashboard | SharePulse Admin",
  description: "ML-powered content moderation dashboard",
}

export default function AdvancedModerationPage() {
  return (
    <div className="container py-6">
      <AdvancedModerationDashboard />
    </div>
  )
}

