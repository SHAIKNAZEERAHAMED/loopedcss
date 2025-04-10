"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Play, Pause, CheckCircle, XCircle, Mic } from "lucide-react"
import { ref, onValue, off, update } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { getUserProfile } from "@/lib/user-service"
import { updateAudioModerationStatus } from "@/lib/audio-moderation-service"
import { formatDistanceToNow } from "date-fns"

interface AudioModerationItem {
  id: string
  postId: string
  authorId: string
  authorName: string
  authorPhoto: string | null
  audioUrl: string
  transcript: string
  flaggedContent: {
    abusiveLanguage: string[]
    misinformation: string[]
    unauthorizedApps: string[]
  }
  timestamp: number
  reviewed: boolean
  reviewResult?: "approved" | "rejected"
}

export function AudioModerationPanel() {
  const [moderationItems, setModerationItems] = useState<AudioModerationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Subscribe to audio moderation logs
    const logsRef = ref(db, "moderation-logs")

    const unsubscribe = onValue(logsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()

        // Filter for audio moderation items
        const audioItems = await Promise.all(
          Object.entries(data)
            .filter(([_, item]: [string, any]) => item.type === "audio")
            .map(async ([id, item]: [string, any]) => {
              // Fetch author details
              let authorName = "Unknown User"
              let authorPhoto = null

              if (item.userId) {
                const user = await getUserProfile(item.userId)
                if (user) {
                  authorName = user.displayName || "User"
                  authorPhoto = user.photoURL
                }
              }

              return {
                id,
                postId: item.postId || "",
                authorId: item.userId || "",
                authorName,
                authorPhoto,
                audioUrl: item.audioUrl || "",
                transcript: item.transcript || "",
                flaggedContent: item.flaggedContent || {
                  abusiveLanguage: [],
                  misinformation: [],
                  unauthorizedApps: [],
                },
                timestamp: item.timestamp || Date.now(),
                reviewed: item.reviewed || false,
                reviewResult: item.reviewResult,
              } as AudioModerationItem
            }),
        )

        // Sort newest first
        audioItems.sort((a, b) => b.timestamp - a.timestamp)
        setModerationItems(audioItems)
      } else {
        setModerationItems([])
      }

      setLoading(false)
    })

    return () => off(logsRef, "value", unsubscribe)
  }, [])

  const togglePlayAudio = (audioUrl: string) => {
    if (audioRef.current) {
      if (currentlyPlaying === audioUrl) {
        // Pause current audio
        audioRef.current.pause()
        setCurrentlyPlaying(null)
      } else {
        // Play new audio
        audioRef.current.src = audioUrl
        audioRef.current.play()
        setCurrentlyPlaying(audioUrl)
      }
    }
  }

  const handleAudioEnded = () => {
    setCurrentlyPlaying(null)
  }

  const handleApprove = async (item: AudioModerationItem) => {
    try {
      // Update post moderation status
      await updateAudioModerationStatus(item.postId, "approved", "Audio content approved by moderator")

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
    } catch (error) {
      console.error("Error approving audio:", error)
    }
  }

  const handleReject = async (item: AudioModerationItem) => {
    try {
      // Update post moderation status
      await updateAudioModerationStatus(item.postId, "rejected", "Audio content rejected by moderator")

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
    } catch (error) {
      console.error("Error rejecting audio:", error)
    }
  }

  return (
    <div className="space-y-6">
      <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading audio moderation items...</div>
          ) : moderationItems.filter((item) => !item.reviewed).length === 0 ? (
            <div className="text-center py-8">
              <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No audio content pending review</p>
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
                          <AvatarImage src={item.authorPhoto || ""} />
                          <AvatarFallback>{item.authorName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{item.authorName}</CardTitle>
                          <CardDescription>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                        Pending Review
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 bg-muted p-3 rounded-md">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-full"
                        onClick={() => togglePlayAudio(item.audioUrl)}
                      >
                        {currentlyPlaying === item.audioUrl ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Audio Recording</p>
                        <p className="text-xs text-muted-foreground">
                          {currentlyPlaying === item.audioUrl ? "Playing..." : "Click to play"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">Transcript:</h4>
                      <p className="text-sm bg-muted p-3 rounded-md">{item.transcript}</p>
                    </div>

                    {(item.flaggedContent.abusiveLanguage.length > 0 ||
                      item.flaggedContent.misinformation.length > 0 ||
                      item.flaggedContent.unauthorizedApps.length > 0) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Flagged Content:</h4>

                        {item.flaggedContent.abusiveLanguage.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-500">Abusive Language:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.flaggedContent.abusiveLanguage.map((term) => (
                                <Badge key={term} variant="outline" className="bg-red-50 text-red-500 border-red-200">
                                  {term}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.flaggedContent.misinformation.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-amber-500">Potential Misinformation:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.flaggedContent.misinformation.map((term) => (
                                <Badge
                                  key={term}
                                  variant="outline"
                                  className="bg-amber-50 text-amber-500 border-amber-200"
                                >
                                  {term}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.flaggedContent.unauthorizedApps.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-blue-500">Unauthorized Apps:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.flaggedContent.unauthorizedApps.map((app) => (
                                <Badge key={app} variant="outline" className="bg-blue-50 text-blue-500 border-blue-200">
                                  {app}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" className="gap-2" onClick={() => handleApprove(item)}>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Approve
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
              <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No reviewed audio content</p>
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
                          <AvatarImage src={item.authorPhoto || ""} />
                          <AvatarFallback>{item.authorName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{item.authorName}</CardTitle>
                          <CardDescription>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          item.reviewResult === "approved"
                            ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-red-50 text-red-600 border-red-200"
                        }
                      >
                        {item.reviewResult === "approved" ? "Approved" : "Rejected"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 bg-muted p-3 rounded-md">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-full"
                        onClick={() => togglePlayAudio(item.audioUrl)}
                      >
                        {currentlyPlaying === item.audioUrl ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Audio Recording</p>
                        <p className="text-xs text-muted-foreground">
                          {currentlyPlaying === item.audioUrl ? "Playing..." : "Click to play"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-1">Transcript:</h4>
                      <p className="text-sm bg-muted p-3 rounded-md">{item.transcript}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

