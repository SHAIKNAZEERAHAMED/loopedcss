import { EarningsDashboard } from "@/components/creator/earnings-dashboard"

export default function CreatorEarningsPage() {
  return (
    <div className="container py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Creator Earnings</h1>
        <p className="text-muted-foreground">Track your earnings and manage your premium content</p>
      </div>

      <EarningsDashboard />
    </div>
  )
}

