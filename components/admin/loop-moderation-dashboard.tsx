"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertTriangle, CheckCircle, XCircle, Video, Shield, Clock, Filter } from "lucide-react"
import { ref, onValue, off, update } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { getUserProfile } from "@/lib/user-service"
import { updateLoopModerationStatus } from "@/lib/loop-moderation-service"
import { formatDistanceToNow } from "date-fns"
import { io } from "socket.io-client"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Initialize Socket.IO client
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001")

interface LoopModerationItem {
  id: string
  loopId?: string
  userId: string
  userName?: string
  userPhoto?: string | null
  transcript?: string
  loopUrl?: string
  timestamp: number
  reviewed: boolean
  reviewResult?: "approved" | "rejected" | "age_restricted"
  visualAnalysis?: any
  audioAnalysis?: any
  overallSafetyScore: number
  requiresHumanReview: boolean
  reviewReason?: string
}

interface ModerationStats {
  pendingItems: number
  reviewedToday: number
  approvalRate: number
  avgSafetyScore: number
  roastingContent: number
}

export function LoopModerationDashboard() {
  const [moderationItems, setModerationItems] = useState<LoopModerationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ModerationStats>({
    pendingItems: 0,
    reviewedToday: 0,
    approvalRate: 0,
    avgSafetyScore: 0,
    roastingContent: 0,
  })
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "severity">("newest")

  useEffect(() => {
    // Subscribe to moderation logs
    const logsRef = ref(db, "loop-moderation-logs")

    const unsubscribe = onValue(logsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()

        // Process all moderation items
        const items = await Promise.all(
          Object.entries(data).map(async ([id, item]: [string, any]) => {
            // Fetch user details
            let userName = "Unknown User"
            let userPhoto = null

            if (item.userId) {
              const user = await getUserProfile(item.userId)
              if (user) {
                userName = user.displayName || "User"
                userPhoto = user.photoURL
              }
            }

            return {
              id,
              loopId: item.loopId,
              userId: item.userId,
              userName,
              userPhoto,
              transcript: item.transcript,
              loopUrl: item.loopUrl,
              timestamp: item.timestamp,
              reviewed: item.reviewed || false,
              reviewResult: item.reviewResult,
              visualAnalysis: item.visualAnalysis,
              audioAnalysis: item.audioAnalysis,
              overallSafetyScore: item.overallSafetyScore || 0.5,
              requiresHumanReview: item.requiresHumanReview || false,
              reviewReason: item.reviewReason,
            } as LoopModerationItem
          }),
        )

        // Calculate stats
        const pendingItems = items.filter((item) => !item.reviewed && item.requiresHumanReview).length
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const reviewedToday = items.filter((item) => item.reviewed && item.timestamp > today.getTime()).length

        const approvedItems = items.filter((item) => item.reviewed && item.reviewResult === "approved").length

        const approvalRate =
          items.filter((item) => item.reviewed).length > 0
            ? approvedItems / items.filter((item) => item.reviewed).length
            : 0

        const avgSafetyScore = items.reduce((acc, item) => acc + item.overallSafetyScore, 0) / (items.length || 1)

        const roastingContent = items.filter((item) => item.audioAnalysis?.roastingContext?.isRoasting).length

        setStats({
          pendingItems,
          reviewedToday,
          approvalRate,
          avgSafetyScore,
          roastingContent,
        })

        // Sort items
        const sortedItems = [...items]

        if (sortBy === "newest") {
          sortedItems.sort((a, b) => b.timestamp - a.timestamp)
        } else if (sortBy === "oldest") {
          sortedItems.sort((a, b) => a.timestamp - b.timestamp)
        } else if (sortBy === "severity") {
          sortedItems.sort((a, b) => a.overallSafetyScore - b.overallSafetyScore)
        }

        setModerationItems(sortedItems)
      } else {
        setModerationItems([])
      }

      setLoading(false)
    })

    // Subscribe to real-time moderation events
    socket.on("new-moderation-item", (data) => {
      console.log("New moderation item received:", data)
      // We don't need to do anything here as the database listener will update the UI
    })

    return () => {
      off(logsRef, "value", unsubscribe)
      socket.off("new-moderation-item")
    }
  }, [sortBy])

  const handleApprove = async (item: LoopModerationItem) => {
    try {
      if (item.loopId) {
        await updateLoopModerationStatus(item.loopId, "approved", "Content approved by moderator")
      }

      // Update moderation log
      await update(ref(db, `loop-moderation-logs/${item.id}`), {
        reviewed: true,
        reviewResult: "approved",
        reviewedAt: Date.now(),
      })

      // Update local state
      setModerationItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, reviewed: true, reviewResult: "approved" } : i)),
      )

      // Emit real-time event
      socket.emit("moderation-action", {
        itemId: item.id,
        action: "approved",
        moderatorId: "admin", // In a real app, this would be the current user's ID
      })
    } catch (error) {
      console.error("Error approving content:", error)
    }
  }

  const handleReject = async (item: LoopModerationItem) => {
    try {
      if (item.loopId) {
        await updateLoopModerationStatus(item.loopId, "rejected", "Content rejected by moderator")
      }

      // Update moderation log
      await update(ref(db, `loop-moderation-logs/${item.id}`), {
        reviewed: true,
        reviewResult: "rejected",
        reviewedAt: Date.now(),
      })

      // Update local state
      setModerationItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, reviewed: true, reviewResult: "rejected" } : i)),
      )

      // Emit real-time event
      socket.emit("moderation-action", {
        itemId: item.id,
        action: "rejected",
        moderatorId: "admin", // In a real app, this would be the current user's ID
      })
    } catch (error) {
      console.error("Error rejecting content:", error)
    }
  }

  const handleAgeRestrict = async (item: LoopModerationItem) => {
    try {
      if (item.loopId) {
        await updateLoopModerationStatus(item.loopId, "age_restricted", "Content age-restricted by moderator")
      }

      // Update moderation log
      await update(ref(db, `loop-moderation-logs/${item.id}`), {
        reviewed: true,
        reviewResult: "age_restricted",
        reviewedAt: Date.now(),
      })

      // Update local state
      setModerationItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, reviewed: true, reviewResult: "age_restricted" } : i)),
      )

      // Emit real-time event
      socket.emit("moderation-action", {
        itemId: item.id,
        action: "age_restricted",
        moderatorId: "admin", // In a real app, this would be the current user's ID
      })
    } catch (error) {
      console.error("Error age-restricting content:", error)
    }
  }

  const getSafetyScoreColor = (score: number) => {
    if (score >= 0.7) return "bg-green-500"
    if (score >= 0.4) return "bg-amber-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.pendingItems}</div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reviewed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.reviewedToday}</div>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{Math.round(stats.approvalRate * 100)}%</div>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{Math.round(stats.avgSafetyScore * 100)}</div>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <Progress
                value={stats.avgSafetyScore * 100}
                className="h-2"
                indicatorClassName={getSafetyScoreColor(stats.avgSafetyScore)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Roasting Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.roastingContent}</div>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Sort by:</span>
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="severity">Severity</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Human Review</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading moderation items...</div>
          ) : moderationItems.filter((item) => !item.reviewed && item.requiresHumanReview).length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No content pending human review</p>
            </div>
          ) : (
            moderationItems
              .filter((item) => !item.reviewed && item.requiresHumanReview)
              .map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={item.userPhoto || ""} />
                          <AvatarFallback>{item.userName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{item.userName}</CardTitle>
                          <CardDescription>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                          Needs Human Review
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          Loop
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Review Reason */}
                    {item.reviewReason && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Reason for Review:</h4>
                        <p className="text-sm bg-amber-50 text-amber-700 p-3 rounded-md">{item.reviewReason}</p>
                      </div>
                    )}

                    {/* Transcript */}
                    {item.transcript && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Transcript:</h4>
                        <p className="text-sm bg-muted p-3 rounded-md">{item.transcript}</p>
                      </div>
                    )}

                    {/* Loop Preview */}
                    {item.loopUrl && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Loop:</h4>
                        <video src={item.loopUrl} controls className="w-full max-h-[200px] object-cover rounded-md" />
                      </div>
                    )}

                    {/* Roasting Context */}
                    {item.audioAnalysis?.roastingContext?.isRoasting && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Roasting Context:</h4>
                        <div className="bg-purple-50 p-3 rounded-md space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Intensity:</span>
                            <Badge
                              variant="outline"
                              className={
                                item.audioAnalysis.roastingContext.intensity === "mild"
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : item.audioAnalysis.roastingContext.intensity === "moderate"
                                    ? "bg-amber-50 text-amber-600 border-amber-200"
                                    : "bg-red-50 text-red-600 border-red-200"
                              }
                            >
                              {item.audioAnalysis.roastingContext.intensity.charAt(0).toUpperCase() +
                                item.audioAnalysis.roastingContext.intensity.slice(1)}
                            </Badge>
                          </div>

                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Mutual:</span>
                            <Badge
                              variant="outline"
                              className={
                                item.audioAnalysis.roastingContext.isMutual
                                  ? "bg-green-50 text-green-600 border-green-200"
                                  : "bg-red-50 text-red-600 border-red-200"
                              }
                            >
                              {item.audioAnalysis.roastingContext.isMutual ? "Yes" : "No"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Safety Score */}
                    <div>
                      <h4 className="text-sm font-medium mb-1">Safety Score:</h4>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={item.overallSafetyScore * 100}
                          className="h-2 flex-1"
                          indicatorClassName={getSafetyScoreColor(item.overallSafetyScore)}
                        />
                        <span className="text-sm font-medium">{Math.round(item.overallSafetyScore * 100)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="gap-2" onClick={() => handleApprove(item)}>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Approve
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2 border-amber-200 text-amber-500 hover:bg-amber-50"
                        onClick={() => handleAgeRestrict(item)}
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Age Restrict
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2 border-red-200 text-red-500 hover:bg-red-50"
                        onClick={() => handleReject(item)}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading reviewed items...</div>
          ) : moderationItems.filter((item) => item.reviewed).length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No reviewed content</p>
            </div>
          ) : (
            moderationItems
              .filter((item) => item.reviewed)
              .map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Avatar>
                          <AvatarImage src={item.userPhoto || ""} />
                          <AvatarFallback>{item.userName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{item.userName}</CardTitle>
                          <CardDescription>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            item.reviewResult === "approved"
                              ? "bg-green-50 text-green-600 border-green-200"
                              : item.reviewResult === "age_restricted"
                                ? "bg-amber-50 text-amber-600 border-amber-200"
                                : "bg-red-50 text-red-600 border-red-200"
                          }
                        >
                          {item.reviewResult === "approved"
                            ? "Approved"
                            : item.reviewResult === "age_restricted"
                              ? "Age Restricted"
                              : "Rejected"}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          Loop
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Transcript */}
                    {item.transcript && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Transcript:</h4>
                        <p className="text-sm bg-muted p-3 rounded-md">{item.transcript}</p>
                      </div>
                    )}

                    {/* Loop Preview */}
                    {item.loopUrl && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Loop:</h4>
                        <video src={item.loopUrl} controls className="w-full max-h-[200px] object-cover rounded-md" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

