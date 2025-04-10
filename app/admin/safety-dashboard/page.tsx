'use client';

import AdminLayout from "@/components/admin/admin-layout"
import { SafetyDashboard } from "@/components/admin/safety-dashboard"

export default function SafetyDashboardPage() {
  return (
    <AdminLayout title="Safety Dashboard">
      <div className="container py-6">
        <SafetyDashboard />
      </div>
    </AdminLayout>
  )
}

