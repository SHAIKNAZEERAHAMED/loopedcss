'use client';

import AdminLayout from "@/components/admin/admin-layout"
import { DMSafetyDashboard } from "@/components/admin/dm-safety-dashboard"

export default function DmSafetyPage() {
  return (
    <AdminLayout title="DM Safety">
      <div className="container py-6">
        <DMSafetyDashboard />
      </div>
    </AdminLayout>
  )
}

