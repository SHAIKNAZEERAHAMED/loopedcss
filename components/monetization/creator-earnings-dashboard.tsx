"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { DiamondIcon as Indian } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import { getCreatorEarnings, processCreatorPayout, type CreatorEarnings } from "@/lib/monetization-service"

export function CreatorEarningsDashboard() {
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayout, setProcessingPayout] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user) return

      try {
        const userEarnings = await getCreatorEarnings(user.uid)
        setEarnings(userEarnings)
      } catch (error) {
        console.error("Error fetching creator earnings:", error)
        toast({
          title: "Error",
          description: "Failed to load your earnings data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [user, toast])

  const handlePayout = async (method: string) => {
    if (!user || !earnings || processingPayout) return

    if (earnings.availableBalance <= 0) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have any available balance to withdraw.",
        variant: "destructive",
      })
      return
    }

    setProcessingPayout(true)

    try {
      await processCreatorPayout(user.uid, earnings.availableBalance, method)

      // Update local state
      setEarnings((prev) => {
        if (!prev) return null

        return {
          ...prev,
          availableBalance: 0,
          lastPayout: {
            amount: prev.availableBalance,
            date: Date.now(),
            method,
            status: "processed",
          },
        }
      })

      toast({
        title: "Payout Processed",
        description: `Your payout of ₹${earnings.availableBalance.toFixed(2)} has been processed via ${method}.`,
      })
    } catch (error) {
      console.error("Error processing payout:", error)
      toast({
        title: "Payout Error",
        description: "Failed to process your payout. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingPayout(false)
    }
  }

  // Prepare chart data
  const prepareMonthlyData = () => {
    if (!earnings) return []

    return Object.entries(earnings.earningsHistory).map(([month, data]) => ({
      month,
      earnings: data.earnings,
      views: data.views,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
    }))
  }

  const prepareEngagementData = () => {
    if (!earnings) return []

    // Sum up all engagement across all months
    let totalViews = 0
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0

    Object.values(earnings.earningsHistory).forEach((data) => {
      totalViews += data.views
      totalLikes += data.likes
      totalComments += data.comments
      totalShares += data.shares
    })

    return [
      { name: "Views", value: totalViews, color: "#8884d8" },
      { name: "Likes", value: totalLikes, color: "#82ca9d" },
      { name: "Comments", value: totalComments, color: "#ffc658" },
      { name: "Shares", value: totalShares, color: "#ff8042" },
    ]
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Earnings</CardTitle>
          <CardDescription>Loading your earnings data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!earnings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Earnings</CardTitle>
          <CardDescription>You're not part of the creator program yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6">Join our creator program to start earning from your content.</p>
        </CardContent>
        <CardFooter>
          <Button className="w-full">Apply for Creator Program</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator Earnings</CardTitle>
        <CardDescription>Track your earnings and engagement metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Indian className="h-5 w-5 mr-2 text-green-500" />
                <span className="text-2xl font-bold">₹{earnings.totalEarnings.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Indian className="h-5 w-5 mr-2 text-green-500" />
                <span className="text-2xl font-bold">₹{earnings.availableBalance.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Indian className="h-5 w-5 mr-2 text-amber-500" />
                <span className="text-2xl font-bold">₹{earnings.pendingBalance.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="earnings">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prepareMonthlyData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Earnings"]}
                    labelFormatter={(label) => {
                      const [year, month] = label.split("-")
                      return `${new Date(Number.parseInt(year), Number.parseInt(month) - 1).toLocaleString("default", { month: "long" })} ${year}`
                    }}
                  />
                  <Bar dataKey="earnings" fill="#8884d8" name="Earnings" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Last Payout</h3>
              {earnings.lastPayout.amount > 0 ? (
                <div className="text-sm">
                  <p>Amount: ₹{earnings.lastPayout.amount.toFixed(2)}</p>
                  <p>Date: {new Date(earnings.lastPayout.date).toLocaleDateString()}</p>
                  <p>Method: {earnings.lastPayout.method}</p>
                  <p>Status: {earnings.lastPayout.status}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No payouts yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={prepareEngagementData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {prepareEngagementData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "Count"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(earnings.earningsHistory).map(([month, data]) => {
                const [year, monthNum] = month.split("-")
                const monthName = new Date(Number.parseInt(year), Number.parseInt(monthNum) - 1).toLocaleString(
                  "default",
                  {
                    month: "long",
                  },
                )

                return (
                  <Card key={month}>
                    <CardHeader className="py-2">
                      <CardTitle className="text-sm">
                        {monthName} {year}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Views:</span>
                          <span>{data.views}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Likes:</span>
                          <span>{data.likes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Comments:</span>
                          <span>{data.comments}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shares:</span>
                          <span>{data.shares}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Earnings:</span>
                          <span>₹{data.earnings.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button
          onClick={() => handlePayout("UPI")}
          disabled={earnings.availableBalance <= 0 || processingPayout}
          className="w-full"
        >
          {processingPayout ? "Processing..." : `Withdraw ₹${earnings.availableBalance.toFixed(2)} via UPI`}
        </Button>
        <p className="text-xs text-muted-foreground text-center">Payouts are processed within 3-5 business days.</p>
      </CardFooter>
    </Card>
  )
}

