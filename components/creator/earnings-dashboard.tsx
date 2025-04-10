"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth/auth-provider"
import { getCreatorEarnings } from "@/lib/paid-loop-service"
import { getPaidLoopsByCreator } from "@/lib/paid-loop-service"
import { hasActiveSubscription, SUBSCRIPTION_TIERS } from "@/lib/subscription-service"
import { DollarSign, TrendingUp, ShoppingCart, Clock, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { PaidLoopCard } from "@/components/loops/paid-loop-card"

export function EarningsDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
    totalSales: 0,
  })

  const [loops, setLoops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasCreatorSubscription, setHasCreatorSubscription] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        setLoading(true)
        try {
          // Check subscription
          const hasCreator = await hasActiveSubscription(user.uid, SUBSCRIPTION_TIERS.CREATOR)
          setHasCreatorSubscription(hasCreator)

          if (hasCreator) {
            // Fetch earnings
            const earningsData = await getCreatorEarnings(user.uid)
            setEarnings(earningsData)

            // Fetch loops
            const loopsData = await getPaidLoopsByCreator(user.uid)
            setLoops(loopsData)
          }
        } catch (error) {
          console.error("Error fetching creator data:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in Required</CardTitle>
          <CardDescription>Please sign in to view your creator earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push("/login")}>Sign In</Button>
        </CardContent>
      </Card>
    )
  }

  if (!hasCreatorSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Subscription Required</CardTitle>
          <CardDescription>You need a Creator subscription to access the earnings dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>With a Creator subscription, you can:</p>
          <ul className="space-y-2 list-disc pl-5">
            <li>Create premium content that your followers can purchase</li>
            <li>Earn 97% of the revenue from your content sales</li>
            <li>Access analytics to track your earnings and content performance</li>
            <li>Get priority support and promotional opportunities</li>
          </ul>
          <Button onClick={() => router.push("/subscription")}>Get Creator Subscription</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">${(earnings.totalEarnings / 100).toFixed(2)}</div>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">${(earnings.pendingEarnings / 100).toFixed(2)}</div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">${(earnings.paidEarnings / 100).toFixed(2)}</div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{earnings.totalSales}</div>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Your Content</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Your Paid Loops</h3>
            <Button onClick={() => router.push("/creator/create-loop")}>Create New Loop</Button>
          </div>

          {loops.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No paid loops yet</h3>
                <p className="text-muted-foreground mb-4">Create your first paid loop to start earning</p>
                <Button onClick={() => router.push("/creator/create-loop")}>Create Paid Loop</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loops.map((loop) => (
                <PaidLoopCard key={loop.id} loop={loop} isPurchased={true} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>Track your earnings and content performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Analytics dashboard coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

