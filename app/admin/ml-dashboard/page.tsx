'use client';

import AdminLayout from "@/components/admin/admin-layout"
import { ModelAccuracyDashboard } from "@/components/admin/model-accuracy-dashboard"

export default function MLDashboardPage() {
  return (
    <AdminLayout title="ML Model Accuracy Dashboard">
      <div className="mb-6">
        <p className="text-muted-foreground">Real-time performance metrics for all machine learning models</p>
      </div>

      <ModelAccuracyDashboard />
    </AdminLayout>
  )
}

