'use client';

import AdminLayout from "@/components/admin/admin-layout"
import { LoopModerationDashboard } from "@/components/admin/loop-moderation-dashboard"

export default function LoopModerationPage() {
  return (
    <AdminLayout title="Loop Moderation">
      <div className="container py-6">
        <LoopModerationDashboard />
      </div>
    </AdminLayout>
  )
}

