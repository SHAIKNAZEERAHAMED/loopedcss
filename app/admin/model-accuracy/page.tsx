import { Suspense } from "react"
import { ModelAccuracyDashboard } from "@/components/admin/model-accuracy-dashboard"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "ML Model Accuracy | SharePulse Admin",
  description: "Monitor the accuracy of ML models used in the platform",
}

export default function ModelAccuracyPage() {
  return (
    <div className="container max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">ML Model Accuracy Dashboard</h1>

      <Suspense fallback={<ModelAccuracySkeleton />}>
        <ModelAccuracyDashboard />
      </Suspense>
    </div>
  )
}

function ModelAccuracySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>

      <Skeleton className="h-[400px] rounded-lg" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-[300px] rounded-lg" />
        <Skeleton className="h-[300px] rounded-lg" />
      </div>
    </div>
  )
}

