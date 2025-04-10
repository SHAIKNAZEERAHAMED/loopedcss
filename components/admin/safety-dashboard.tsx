"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Video,
  Mic,
  MessageSquare,
  User,
  BarChart4,
  Shield,
  Clock,
  Filter,
} from "lucide-react"
import { ref, onValue, off, update } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { getUserProfile } from "@/lib/user-service"
import { updateVideoModerationStatus } from "@/lib/video-moderation-service"
import { updateAudioModerationStatus } from "@/lib/audio-moderation-service"
import { formatDistanceToNow } from "date-fns"
import { io } from "socket.io-client"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Initialize Socket.IO client
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001")

interface ModerationItem {
  id: string
  type: "video" | "audio" | "text" | "user"
  postId?: string
  userId: string
  userName?: string
  userPhoto?: string | null
  content?: string
  mediaUrl?: string
  timestamp: number
  reviewed: boolean
  reviewResult?: "approved" | "rejected" | "age_restricted"
  flags?: string[]
  safetyScore?: number
  cringeScore?: number
}

interface SafetyStats {
  pendingItems: number
  reviewedToday: number
  approvalRate: number
  flaggedContent: {
    video: number
    audio: number
    text: number
    user: number
  }
  safetyScore: number
}

export function SafetyDashboard() {
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SafetyStats>({
    pendingItems: 0,
    reviewedToday: 0,
    approvalRate: 0,
    flaggedContent: {
      video: 0,
      audio: 0,
      text: 0,
      user: 0,
    },
    safetyScore: 0,
  })
  const [filter, setFilter] = useState<"all" | "video" | "audio" | "text" | "user">("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "severity">("newest")

  useEffect(() => {
    // Subscribe to moderation logs
    const logsRef = ref(db, "moderation-logs")

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

            // Determine flags based on item type
            const flags: string[] = []
            let safetyScore = 1.0
            let cringeScore = 0

            if (item.type === "video") {
              if (item.visualAnalysis?.flaggedContent?.inappropriateVisual?.length > 0) {
                flags.push("inappropriate_visual")
              }
              if (item.visualAnalysis?.flaggedContent?.violentContent?.length > 0) {
                flags.push("violent_content")
              }
              if (item.audioAnalysis?.flaggedContent?.abusiveLanguage?.length > 0) {
                flags.push("abusive_language")
              }
              if (item.ageRestriction?.isRestricted) {
                flags.push("age_restricted")
              }
              if (item.cringe?.isCringe) {
                flags.push("cringe_content")
                cringeScore = item.cringe.cringeScore || 0
              }

              safetyScore = item.overallSafetyScore || 0.5
            } else if (item.type === "audio") {
              if (item.flaggedContent?.abusiveLanguage?.length > 0) {
                flags.push("abusive_language")
              }
              if (item.flaggedContent?.misinformation?.length > 0) {
                flags.push("misinformation")
              }
              if (item.flaggedContent?.unauthorizedApps?.length > 0) {
                flags.push("unauthorized_apps")
              }

              safetyScore = item.contextualScore || 0.5
            } else if (item.type === "text") {
              if (item.result?.category === "potentially_harmful") {
                flags.push("harmful_content")
              }

              safetyScore = item.result?.isSafe ? 0.8 : 0.3
            } else if (item.type === "user") {
              if (item.reportCount > 2) {
                flags.push("multiple_reports")
              }
              if (item.dmRequestCount > 10) {
                flags.push("excessive_dm_requests")
              }

              safetyScore = item.safetyScore || 0.5
            }

            return {
              id,
              type: item.type,
              postId: item.postId,
              userId: item.userId,
              userName,
              userPhoto,
              content: item.content || item.transcript,
              mediaUrl: item.videoUrl || item.audioUrl,
              timestamp: item.timestamp,
              reviewed: item.reviewed || false,
              reviewResult: item.reviewResult,
              flags,
              safetyScore,
              cringeScore,
            } as ModerationItem
          }),
        )

        // Calculate stats
        const pendingItems = items.filter((item) => !item.reviewed).length
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const reviewedToday = items.filter((item) => item.reviewed && item.timestamp > today.getTime()).length

        const approvedItems = items.filter((item) => item.reviewed && item.reviewResult === "approved").length

        const approvalRate =
          items.filter((item) => item.reviewed).length > 0
            ? approvedItems / items.filter((item) => item.reviewed).length
            : 0

        const videoItems = items.filter((item) => item.type === "video").length
        const audioItems = items.filter((item) => item.type === "audio").length
        const textItems = items.filter((item) => item.type === "text").length
        const userItems = items.filter((item) => item.type === "user").length

        const avgSafetyScore = items.reduce((acc, item) => acc + (item.safetyScore || 0), 0) / (items.length || 1)

        setStats({
          pendingItems,
          reviewedToday,
          approvalRate,
          flaggedContent: {
            video: videoItems,
            audio: audioItems,
            text: textItems,
            user: userItems,
          },
          safetyScore: avgSafetyScore,
        })

        // Sort and filter items
        let filteredItems = items

        if (filter !== "all") {
          filteredItems = items.filter((item) => item.type === filter)
        }

        // Sort items
        if (sortBy === "newest") {
          filteredItems.sort((a, b) => b.timestamp - a.timestamp)
        } else if (sortBy === "oldest") {
          filteredItems.sort((a, b) => a.timestamp - b.timestamp)
        } else if (sortBy === "severity") {
          filteredItems.sort((a, b) => (a.safetyScore || 0) - (b.safetyScore || 0))
        }

        setModerationItems(filteredItems)
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
  }, [filter, sortBy])

  const handleApprove = async (item: ModerationItem) => {
    try {
      if (item.type === "video" && item.postId) {
        await updateVideoModerationStatus(item.postId, "approved", "Content approved by moderator")
      } else if (item.type === "audio" && item.postId) {
        await updateAudioModerationStatus(item.postId, "approved", "Content approved by moderator")
      }

      // Update moderation log
      await update(ref(db, `moderation-logs/${item.id}`), {
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

  const handleReject = async (item: ModerationItem) => {
    try {
      if (item.type === "video" && item.postId) {
        await updateVideoModerationStatus(item.postId, "rejected", "Content rejected by moderator")
      } else if (item.type === "audio" && item.postId) {
        await updateAudioModerationStatus(item.postId, "rejected", "Content rejected by moderator")
      }

      // Update moderation log
      await update(ref(db, `moderation-logs/${item.id}`), {
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

  const handleAgeRestrict = async (item: ModerationItem) => {
    try {
      if (item.type === "video" && item.postId) {
        await updateVideoModerationStatus(item.postId, "age_restricted", "Content age-restricted by moderator")
      }

      // Update moderation log
      await update(ref(db, `moderation-logs/${item.id}`), {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Mic className="h-4 w-4" />
      case "text":
        return <MessageSquare className="h-4 w-4" />
      case "user":
        return <User className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
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
      <div className="grid gap-4 md:grid-cols-4">
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
              <BarChart4 className="h-4 w-4 text-muted-foreground" />
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
                <div className="text-2xl font-bold">{Math.round(stats.safetyScore * 100)}</div>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <Progress
                value={stats.safetyScore * 100}
                className="h-2"
                indicatorClassName={getSafetyScoreColor(stats.safetyScore)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Content</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="user">Users</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
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
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading moderation items...</div>
          ) : moderationItems.filter((item) => !item.reviewed).length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No content pending review</p>
            </div>
          ) : (
            moderationItems
              .filter((item) => !item.reviewed)
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
                          Pending Review
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          {getTypeIcon(item.type)}
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Content Preview */}
                    {item.content && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Content:</h4>
                        <p className="text-sm bg-muted p-3 rounded-md">{item.content}</p>
                      </div>
                    )}

                    {/* Media Preview */}
                    {item.mediaUrl && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Media:</h4>
                        {item.type === "video" ? (
                          <video
                            src={item.mediaUrl}
                            controls
                            className="w-full max-h-[200px] object-cover rounded-md"
                          />
                        ) : (
                          <audio src={item.mediaUrl} controls className="w-full" />
                        )}
                      </div>
                    )}

                    {/* Flags */}
                    {item.flags && item.flags.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Flagged Content:</h4>
                        <div className="flex flex-wrap gap-1">
                          {item.flags.map((flag, index) => (
                            <Badge key={index} variant="outline" className="bg-red-50 text-red-500 border-red-200">
                              {flag.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Safety Score */}
                    <div>
                      <h4 className="text-sm font-medium mb-1">Safety Score:</h4>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={item.safetyScore ? item.safetyScore * 100 : 50}
                          className="h-2 flex-1"
                          indicatorClassName={getSafetyScoreColor(item.safetyScore || 0.5)}
                        />
                        <span className="text-sm font-medium">{Math.round((item.safetyScore || 0.5) * 100)}</span>
                      </div>
                    </div>

                    {/* Cringe Score (for videos) */}
                    {item.type === "video" && item.cringeScore !== undefined && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Cringe Score:</h4>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={item.cringeScore * 100}
                            className="h-2 flex-1"
                            indicatorClassName="bg-purple-500"
                          />
                          <span className="text-sm font-medium">{Math.round(item.cringeScore * 100)}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="gap-2" onClick={() => handleApprove(item)}>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Approve
                      </Button>

                      {item.type === "video" && (
                        <Button
                          variant="outline"
                          className="gap-2 border-amber-200 text-amber-500 hover:bg-amber-50"
                          onClick={() => handleAgeRestrict(item)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Age Restrict
                        </Button>
                      )}

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
                          {getTypeIcon(item.type)}
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Content Preview */}
                    {item.content && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Content:</h4>
                        <p className="text-sm bg-muted p-3 rounded-md">{item.content}</p>
                      </div>
                    )}

                    {/* Media Preview */}
                    {item.mediaUrl && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Media:</h4>
                        {item.type === "video" ? (
                          <video
                            src={item.mediaUrl}
                            controls
                            className="w-full max-h-[200px] object-cover rounded-md"
                          />
                        ) : (
                          <audio src={item.mediaUrl} controls className="w-full" />
                        )}
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

