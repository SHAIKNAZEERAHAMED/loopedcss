"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type PaidLoop, hasUserPurchasedLoop, getLoopModerationSummary } from "@/lib/paid-loop-service"
import { useAuth } from "@/components/auth/auth-provider"
import { toast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { Lock, Shield, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface PaidLoopViewerProps {
  loop: PaidLoop
}

export function PaidLoopViewer({ loop }: PaidLoopViewerProps) {
  const { user } = useAuth()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [hasPurchased, setHasPurchased] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [moderationSummary, setModerationSummary] = useState("")

  // Check if user has purchased this loop
  useEffect(() => {
    const checkPurchase = async () => {
      if (user) {
        setIsLoading(true)
        try {
          const purchased = await hasUserPurchasedLoop(user.uid, loop.id)
          setHasPurchased(purchased)

          // Get moderation summary
          const summary = await getLoopModerationSummary(loop.id)
          setModerationSummary(summary)
        } catch (error) {
          console.error("Error checking purchase:", error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    checkPurchase()
  }, [user, loop.id])

  // Prevent screenshots and recordings if exclusive content
  useEffect(() => {
    if (!loop.isExclusive || !hasPurchased) return

    const preventScreenCapture = () => {
      if (document.pictureInPictureEnabled) {
        videoRef.current?.disablePictureInPicture()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && videoRef.current) {
        videoRef.current.pause()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common screenshot key combinations
      if (
        e.key === "PrintScreen" ||
        (e.ctrlKey && e.key === "p") ||
        (e.ctrlKey && e.shiftKey && e.key === "p") ||
        (e.metaKey && e.shiftKey && e.key === "4") ||
        (e.metaKey && e.shiftKey && e.key === "3")
      ) {
        e.preventDefault()
        toast({
          title: "Screenshots disabled",
          description: "Screenshots are disabled for exclusive content",
          variant: "destructive",
        })
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    // Apply CSS to prevent selection and dragging
    if (containerRef.current) {
      containerRef.current.style.userSelect = "none"
      containerRef.current.style.webkitUserSelect = "none"
    }

    if (videoRef.current) {
      videoRef.current.style.pointerEvents = "none"
      preventScreenCapture()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("contextmenu", handleContextMenu)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("contextmenu", handleContextMenu)
    }
  }, [loop.isExclusive, hasPurchased])

  const handlePurchase = () => {
    router.push(`/loops/purchase/${loop.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in Required</CardTitle>
          <CardDescription>Please sign in to view this content</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => router.push("/login")}>Sign In</Button>
        </CardFooter>
      </Card>
    )
  }

  if (!hasPurchased) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{loop.title}</CardTitle>
          <CardDescription>Premium content by {loop.creatorName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loop.previewImageUrl && (
            <div className="relative">
              <img src={loop.previewImageUrl || "/placeholder.svg"} alt={loop.title} className="w-full rounded-md" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Lock className="h-16 w-16 text-white opacity-70" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p>{loop.description}</p>

            <div className="flex flex-wrap gap-2 mt-2">
              {loop.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-2xl font-bold">${(loop.price / 100).toFixed(2)}</div>
          <Button onClick={handlePurchase}>Purchase to View</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div ref={containerRef}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{loop.title}</CardTitle>
              <CardDescription>{formatDistanceToNow(loop.createdAt, { addSuffix: true })}</CardDescription>
            </div>
            {loop.isExclusive && <Badge className="bg-primary">Exclusive</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Player */}
          <div className="relative bg-black rounded-md overflow-hidden">
            <video
              ref={videoRef}
              src={loop.videoUrl}
              controls
              controlsList="nodownload"
              className="w-full"
              onContextMenu={(e) => e.preventDefault()}
            />

            {loop.isExclusive && (
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className="bg-black/50 text-white border-none">
                  <Lock className="h-3 w-3 mr-1" />
                  Protected Content
                </Badge>
              </div>
            )}
          </div>

          {/* Creator Info */}
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={loop.creatorPhotoUrl || ""} />
              <AvatarFallback>{loop.creatorName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{loop.creatorName}</p>
              <p className="text-sm text-muted-foreground">Creator</p>
            </div>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="moderation">Moderation Info</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="space-y-4">
              <p>{loop.description}</p>

              <div className="flex flex-wrap gap-2">
                {loop.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="moderation" className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Moderation Summary</p>
                  <p className="text-sm">{moderationSummary}</p>
                </div>
              </div>

              {loop.isExclusive && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-md">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Screenshot Protection</p>
                    <p className="text-sm">
                      This content is protected against screenshots and screen recordings. Attempting to capture this
                      content violates our terms of service.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

