import { SubscriptionPlans } from "@/components/subscription/subscription-plans"

export default function SubscriptionPage() {
  return (
    <div className="container py-10 space-y-6">
      <div className="text-center space-y-2 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground">
          Upgrade your experience with premium features or monetize your content with a creator subscription
        </p>
      </div>

      <SubscriptionPlans />

      <div className="bg-muted p-6 rounded-lg mt-10">
        <h2 className="text-xl font-semibold mb-4">Why Subscribe?</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-medium">Ad-Free Experience</h3>
            <p className="text-sm text-muted-foreground">
              Enjoy the platform without any advertisements or interruptions
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Exclusive Content</h3>
            <p className="text-sm text-muted-foreground">Access premium content from your favorite creators</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium">Monetize Your Content</h3>
            <p className="text-sm text-muted-foreground">
              Create paid loops and earn 97% of the revenue from your sales
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

