"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { useAuth } from "@/contexts/auth-context"
import { getUserSafetyMetrics, type SafetyMetrics } from "@/lib/moderation-service"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export function SafetyDashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<SafetyMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMetrics() {
      if (!user) return
      try {
        const data = await getUserSafetyMetrics(user.uid)
        setMetrics(data)
      } catch (err) {
        setError("Failed to load safety metrics")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
    // Refresh every minute
    const interval = setInterval(loadMetrics, 60000)
    return () => clearInterval(interval)
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!metrics) {
    return null
  }

  const trendData = metrics.trend.map((score, index) => ({
    day: index + 1,
    score
  }))

  const getSafetyColor = (score: number) => {
    if (score >= 90) return "text-green-500"
    if (score >= 70) return "text-yellow-500"
    return "text-red-500"
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "hate_speech":
        return "bg-red-500"
      case "violence":
        return "bg-orange-500"
      case "harassment":
        return "bg-yellow-500"
      case "profanity":
        return "bg-blue-500"
      case "adult":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Safety Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Overall Safety Score</p>
                <h3 className={`text-3xl font-bold ${getSafetyColor(metrics.safetyScore)}`}>
                  {metrics.safetyScore}%
                </h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Posts</p>
                <p className="text-2xl font-semibold">{metrics.totalPosts}</p>
              </div>
            </div>

            <Progress value={metrics.safetyScore} className="h-2" />

            <div className="grid gap-4 grid-cols-2">
              <div>
                <p className="text-sm font-medium mb-1">Safe Posts</p>
                <p className="text-2xl font-semibold text-green-500">
                  {metrics.totalPosts - metrics.flaggedPosts}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Flagged Posts</p>
                <p className="text-2xl font-semibold text-red-500">
                  {metrics.flaggedPosts}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Safety Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(metrics.categories).map(([category, count]) => (
              <div key={category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium capitalize">
                    {category.replace("_", " ")}
                  </span>
                  <span>{count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${getCategoryColor(category)}`}
                    style={{
                      width: `${(count / metrics.flaggedPosts) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 