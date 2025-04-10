"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { SUBSCRIPTION_PLANS, createCheckoutSession } from "@/lib/subscription-service"
import { toast } from "@/hooks/use-toast"

export function SubscriptionPlans() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to subscribe to a plan",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setLoading(planId)

    try {
      const result = await createCheckoutSession(
        user.uid,
        planId as any,
        `${window.location.origin}/subscription/success?plan=${planId}`,
        `${window.location.origin}/subscription/cancel`,
      )

      if (result?.url) {
        window.location.href = result.url
      } else {
        throw new Error("Failed to create checkout session")
      }
    } catch (error) {
      console.error("Error subscribing:", error)
      toast({
        title: "Subscription error",
        description: "There was an error processing your subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {SUBSCRIPTION_PLANS.map((plan) => (
        <Card key={plan.id} className={`flex flex-col ${plan.isPopular ? "border-primary shadow-md" : ""}`}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="mt-1">{plan.description}</CardDescription>
              </div>
              {plan.isPopular && <Badge className="bg-primary hover:bg-primary">Popular</Badge>}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="mb-4">
              <span className="text-3xl font-bold">${(plan.price / 100).toFixed(2)}</span>
              {plan.price > 0 && <span className="text-muted-foreground ml-1">/month</span>}
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant={plan.id === "free" ? "outline" : "default"}
              onClick={() => plan.id !== "free" && handleSubscribe(plan.id)}
              disabled={loading === plan.id || plan.id === "free"}
            >
              {loading === plan.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : plan.id === "free" ? (
                "Current Plan"
              ) : (
                `Subscribe to ${plan.name}`
              )}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

