"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  BarChart3,
  MessageSquare,
  Image,
  Video,
  FileAudio,
  Loader2,
} from "lucide-react"
import { ref, onValue, get, update } from "firebase/database"
import { db } from "@/lib/firebase/config"
import {
  type ModerationResult,
  ModerationSeverity,
  ContentCategory,
  type ContentType,
} from "@/lib/advanced-moderation-service"
import { formatDistanceToNow } from "date-fns"

interface ModerationQueueItem {
  moderationId: string
  userId: string
  timestamp: number
  contentUrl: string
  thumbnailUrl?: string
  initialAssessment: string
  transcriptionNeeded?: boolean
}

export function AdvancedModerationDashboard() {
  const [activeTab, setActiveTab] = useState("queue")
  const [queueItems, setQueueItems] = useState<Record<string, ModerationQueueItem[]>>({
    text: [],
    image: [],
    video: [],
    audio: [],
  })
  const [recentModeration, setRecentModeration] = useState<ModerationResult[]>([])
  const [moderationStats, setModerationStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    byCategory: {} as Record<ContentCategory, number>,
    bySeverity: {} as Record<ModerationSeverity, number>,
  })
  const [loading, setLoading] = useState(true)

  // Load moderation queue
  useEffect(() => {
    const loadQueue = () => {
      // Text queue
      const textQueueRef = ref(db, "moderation-queue/text")
      onValue(textQueueRef, (snapshot) => {
        const items: ModerationQueueItem[] = []
        snapshot.forEach((childSnapshot) => {
          const key = childSnapshot.key as string
          const data = childSnapshot.val()
          items.push({
            ...data,
            id: key,
            contentType: "text",
          })
        })
        setQueueItems((prev) => ({ ...prev, text: items }))
      })

      // Image queue
      const imageQueueRef = ref(db, "moderation-queue/image")
      onValue(imageQueueRef, (snapshot) => {
        const items: ModerationQueueItem[] = []
        snapshot.forEach((childSnapshot) => {
          const key = childSnapshot.key as string
          const data = childSnapshot.val()
          items.push({
            ...data,
            id: key,
            contentType: "image",
          })
        })
        setQueueItems((prev) => ({ ...prev, image: items }))
      })

      // Video queue
      const videoQueueRef = ref(db, "moderation-queue/video")
      onValue(videoQueueRef, (snapshot) => {
        const items: ModerationQueueItem[] = []
        snapshot.forEach((childSnapshot) => {
          const key = childSnapshot.key as string
          const data = childSnapshot.val()
          items.push({
            ...data,
            id: key,
            contentType: "video",
          })
        })
        setQueueItems((prev) => ({ ...prev, video: items }))
      })

      // Audio queue
      const audioQueueRef = ref(db, "moderation-queue/audio")
      onValue(audioQueueRef, (snapshot) => {
        const items: ModerationQueueItem[] = []
        snapshot.forEach((childSnapshot) => {
          const key = childSnapshot.key as string
          const data = childSnapshot.val()
          items.push({
            ...data,
            id: key,
            contentType: "audio",
          })
        })
        setQueueItems((prev) => ({ ...prev, audio: items }))
      })
    }

    loadQueue()
  }, [])

  // Load recent moderation results
  useEffect(() => {
    const loadRecentModeration = async () => {
      setLoading(true)
      try {
        const moderationRef = ref(db, "moderation")
        const moderationSnapshot = await get(moderationRef)

        const results: ModerationResult[] = []
        moderationSnapshot.forEach((childSnapshot) => {
          const result = childSnapshot.val() as ModerationResult
          results.push(result)
        })

        // Sort by timestamp in descending order
        const sortedResults = results.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50)
        setRecentModeration(sortedResults)

        // Calculate stats
        const stats = {
          total: results.length,
          approved: results.filter((r) => r.isApproved).length,
          rejected: results.filter((r) => !r.isApproved).length,
          pending: 0,
          byCategory: {} as Record<ContentCategory, number>,
          bySeverity: {} as Record<ModerationSeverity, number>,
        }

        // Count by category
        results.forEach((result) => {
          result.categories.forEach((category) => {
            if (!stats.byCategory[category]) {
              stats.byCategory[category] = 0
            }
            stats.byCategory[category]++
          })

          if (!stats.bySeverity[result.severity]) {
            stats.bySeverity[result.severity] = 0
          }
          stats.bySeverity[result.severity]++
        })

        setModerationStats(stats)
      } catch (error) {
        console.error("Error loading recent moderation:", error)
      } finally {
        setLoading(false)
      }
    }

    loadRecentModeration()
  }, [])

  // Approve content
  const approveContent = async (contentId: string, moderationId: string, contentType: ContentType) => {
    try {
      // Update moderation result
      await update(ref(db, `moderation/${moderationId}`), {
        isApproved: true,
      })

      // Update content status
      await update(ref(db, `content/${contentId}/moderationStatus`), {
        isApproved: true,
        requiresHumanReview: false,
      })

      // Remove from queue
      await update(ref(db, `moderation-queue/${contentType}/${contentId}`), null)

      // Update UI
      setRecentModeration((prev) =>
        prev.map((item) => (item.id === moderationId ? { ...item, isApproved: true } : item)),
      )
    } catch (error) {
      console.error("Error approving content:", error)
    }
  }

  // Reject content
  const rejectContent = async (contentId: string, moderationId: string, contentType: ContentType) => {
    try {
      // Update moderation result
      await update(ref(db, `moderation/${moderationId}`), {
        isApproved: false,
      })

      // Update content status
      await update(ref(db, `content/${contentId}/moderationStatus`), {
        isApproved: false,
        requiresHumanReview: false,
      })

      // Remove from queue
      await update(ref(db, `moderation-queue/${contentType}/${contentId}`), null)

      // Update UI
      setRecentModeration((prev) =>
        prev.map((item) => (item.id === moderationId ? { ...item, isApproved: false } : item)),
      )
    } catch (error) {
      console.error("Error rejecting content:", error)
    }
  }

  // Get severity badge
  const getSeverityBadge = (severity: ModerationSeverity) => {
    switch (severity) {
      case ModerationSeverity.NONE:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Safe
          </Badge>
        )
      case ModerationSeverity.LOW:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Low
          </Badge>
        )
      case ModerationSeverity.MEDIUM:
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Medium
          </Badge>
        )
      case ModerationSeverity.HIGH:
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            High
          </Badge>
        )
      case ModerationSeverity.CRITICAL:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Critical
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Get content type icon
  const getContentTypeIcon = (contentType: ContentType) => {
    switch (contentType) {
      case "text":
        return <MessageSquare className="h-4 w-4" />
      case "image":
        return <Image className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <FileAudio className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  // Get category badges
  const getCategoryBadges = (categories: ContentCategory[]) => {
    return categories.map((category, index) => {
      let badgeClass = "bg-gray-50 text-gray-700 border-gray-200"

      switch (category) {
        case ContentCategory.SAFE:
          badgeClass = "bg-green-50 text-green-700 border-green-200"
          break
        case ContentCategory.HARASSMENT:
        case ContentCategory.HATE_SPEECH:
          badgeClass = "bg-red-50 text-red-700 border-red-200"
          break
        case ContentCategory.SELF_HARM:
        case ContentCategory.VIOLENCE:
          badgeClass = "bg-orange-50 text-orange-700 border-orange-200"
          break
        case ContentCategory.SEXUAL:
          badgeClass = "bg-purple-50 text-purple-700 border-purple-200"
          break
        case ContentCategory.GAMBLING:
        case ContentCategory.UNAUTHORIZED_PROMOTION:
          badgeClass = "bg-yellow-50 text-yellow-700 border-yellow-200"
          break
        case ContentCategory.SPAM:
        case ContentCategory.MISINFORMATION:
          badgeClass = "bg-blue-50 text-blue-700 border-blue-200"
          break
        case ContentCategory.SARCASM:
        case ContentCategory.ROASTING:
          badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200"
          break
      }

      return (
        <Badge key={index} variant="outline" className={badgeClass}>
          {category.replace(/_/g, " ")}
        </Badge>
      )
    })
  }

  // Calculate queue totals
  const queueTotals = {
    text: queueItems.text.length,
    image: queueItems.image.length,
    video: queueItems.video.length,
    audio: queueItems.audio.length,
    total: queueItems.text.length + queueItems.image.length + queueItems.video.length + queueItems.audio.length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Advanced Moderation Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          ML-Powered
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : moderationStats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  {moderationStats.approved}
                  <span className="text-sm ml-2 text-muted-foreground">
                    ({Math.round((moderationStats.approved / moderationStats.total) * 100) || 0}%)
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-5 w-5 mr-2 text-red-500" />
                  {moderationStats.rejected}
                  <span className="text-sm ml-2 text-muted-foreground">
                    ({Math.round((moderationStats.rejected / moderationStats.total) * 100) || 0}%)
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                  {queueTotals.total}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="queue">
            Review Queue
            {queueTotals.total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {queueTotals.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Review Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Requiring Human Review</CardTitle>
              <CardDescription>Review and moderate content flagged by our ML system</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="video">
                <TabsList className="grid grid-cols-4 w-full max-w-md">
                  <TabsTrigger value="video">
                    Video
                    {queueTotals.video > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {queueTotals.video}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="image">
                    Image
                    {queueTotals.image > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {queueTotals.image}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="audio">
                    Audio
                    {queueTotals.audio > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {queueTotals.audio}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    Text
                    {queueTotals.text > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {queueTotals.text}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Video Queue */}
                <TabsContent value="video">
                  {queueItems.video.length > 0 ? (
                    <div className="space-y-4">
                      {queueItems.video.map((item) => (
                        <Card key={item.contentId}>
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                              <div className="w-full md:w-1/3">
                                {item.thumbnailUrl ? (
                                  <img
                                    src={item.thumbnailUrl || "/placeholder.svg"}
                                    alt="Video thumbnail"
                                    className="w-full h-40 object-cover rounded-md"
                                  />
                                ) : (
                                  <div className="w-full h-40 bg-muted rounded-md flex items-center justify-center">
                                    <Video className="h-10 w-10 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium mb-2">Video Content</h3>
                                <p className="text-sm text-muted-foreground mb-2">{item.initialAssessment}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                  <Badge variant="outline">
                                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(item.videoUrl, "_blank")}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => approveContent(item.contentId, item.moderationId, "video")}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => rejectContent(item.contentId, item.moderationId, "video")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">No videos requiring review</p>
                    </div>
                  )}
                </TabsContent>

                {/* Image Queue */}
                <TabsContent value="image">
                  {queueItems.image.length > 0 ? (
                    <div className="space-y-4">
                      {queueItems.image.map((item) => (
                        <Card key={item.contentId}>
                          <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                              <div className="w-full md:w-1/3">
                                <img
                                  src={item.contentUrl || "/placeholder.svg"}
                                  alt="Image content"
                                  className="w-full h-40 object-cover rounded-md"
                                />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium mb-2">Image Content</h3>
                                <p className="text-sm text-muted-foreground mb-2">{item.initialAssessment}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                  <Badge variant="outline">
                                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(item.contentUrl, "_blank")}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => approveContent(item.contentId, item.moderationId, "image")}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => rejectContent(item.contentId, item.moderationId, "image")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">No images requiring review</p>
                    </div>
                  )}
                </TabsContent>

                {/* Audio Queue */}
                <TabsContent value="audio">
                  {queueItems.audio.length > 0 ? (
                    <div className="space-y-4">
                      {queueItems.audio.map((item) => (
                        <Card key={item.contentId}>
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-4">
                              <div className="w-full bg-muted rounded-md p-4 flex items-center justify-center">
                                <audio controls src={item.audioUrl} className="w-full" />
                              </div>
                              <div>
                                <h3 className="font-medium mb-2">Audio Content</h3>
                                <p className="text-sm text-muted-foreground mb-2">{item.initialAssessment}</p>
                                <div className="flex flex-wrap gap-2 mb-4">
                                  <Badge variant="outline">
                                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                  </Badge>
                                  {item.transcriptionNeeded && (
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                      Transcription Needed
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => approveContent(item.contentId, item.moderationId, "audio")}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => rejectContent(item.contentId, item.moderationId, "audio")}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">No audio requiring review</p>
                    </div>
                  )}
                </TabsContent>

                {/* Text Queue */}
                <TabsContent value="text">
                  {queueItems.text.length > 0 ? (
                    <div className="space-y-4">
                      {queueItems.text.map((item) => (
                        <Card key={item.contentId}>
                          <CardContent className="p-4">
                            <div>
                              <h3 className="font-medium mb-2">Text Content</h3>
                              <div className="bg-muted p-4 rounded-md mb-4">
                                <p>{item.text}</p>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{item.initialAssessment}</p>
                              <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="outline">
                                  {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => approveContent(item.contentId, item.moderationId, "text")}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectContent(item.contentId, item.moderationId, "text")}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">No text requiring review</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Moderation Activity</CardTitle>
              <CardDescription>View the latest content moderation decisions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : recentModeration.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentModeration.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getContentTypeIcon(result.contentType)}
                            <span className="ml-2 capitalize">{result.contentType}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {result.isApproved ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approved
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejected
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getSeverityBadge(result.severity)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">{getCategoryBadges(result.categories)}</div>
                        </TableCell>
                        <TableCell>{formatDistanceToNow(result.timestamp, { addSuffix: true })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No recent moderation activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Content Categories
                </CardTitle>
                <CardDescription>Distribution of content by category</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : Object.keys(moderationStats.byCategory).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(moderationStats.byCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, count]) => (
                        <div key={category} className="flex items-center">
                          <div className="w-32 capitalize">{category.replace(/_/g, " ")}</div>
                          <div className="flex-1">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${(count / moderationStats.total) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="w-12 text-right text-sm">{count}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No category data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Severity Distribution
                </CardTitle>
                <CardDescription>Content by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : Object.keys(moderationStats.bySeverity).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(moderationStats.bySeverity)
                      .sort(([a], [b]) => {
                        const order = {
                          [ModerationSeverity.NONE]: 0,
                          [ModerationSeverity.LOW]: 1,
                          [ModerationSeverity.MEDIUM]: 2,
                          [ModerationSeverity.HIGH]: 3,
                          [ModerationSeverity.CRITICAL]: 4,
                        }
                        return order[a as ModerationSeverity] - order[b as ModerationSeverity]
                      })
                      .map(([severity, count]) => (
                        <div key={severity} className="flex items-center">
                          <div className="w-32">{getSeverityBadge(severity as ModerationSeverity)}</div>
                          <div className="flex-1">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  severity === ModerationSeverity.NONE
                                    ? "bg-green-500"
                                    : severity === ModerationSeverity.LOW
                                      ? "bg-blue-500"
                                      : severity === ModerationSeverity.MEDIUM
                                        ? "bg-yellow-500"
                                        : severity === ModerationSeverity.HIGH
                                          ? "bg-orange-500"
                                          : "bg-red-500"
                                }`}
                                style={{
                                  width: `${(count / moderationStats.total) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="w-12 text-right text-sm">{count}</div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No severity data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

