"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react"
import { ref, get, push, set } from "firebase/database"
import { db, storage } from "@/lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { getUser } from "@/lib/user-service"
import { formatDistanceToNow } from "date-fns"

interface Story {
  id: string
  userId: string
  userName: string
  userPhotoURL: string | null
  mediaURL: string
  mediaType: "image" | "video"
  createdAt: string
  expiresAt: string
  viewedBy?: Record<string, boolean>
}

export function StoriesContainer() {
  const { user } = useAuth()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [showCreateStory, setShowCreateStory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)
  const storiesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchStories() {
      try {
        // Get all stories
        const storiesRef = ref(db, "stories")
        const snapshot = await get(storiesRef)

        if (!snapshot.exists()) {
          setStories([])
          setLoading(false)
          return
        }

        const now = new Date().toISOString()
        const storiesData: Story[] = []

        // Process stories and filter out expired ones
        for (const [id, storyData] of Object.entries(snapshot.val())) {
          const story = storyData as Story

          // Skip expired stories
          if (story.expiresAt < now) continue

          // Get user details if not already included
          if (!story.userName || !story.userPhotoURL) {
            const userProfile = await getUser(story.userId)
            if (userProfile) {
              story.userName = userProfile.displayName || "User"
              story.userPhotoURL = userProfile.photoURL
            }
          }

          storiesData.push({
            id,
            ...story,
          })
        }

        // Group stories by user and sort by creation time
        const groupedStories = storiesData.reduce(
          (acc, story) => {
            if (!acc[story.userId]) {
              acc[story.userId] = []
            }
            acc[story.userId].push(story)
            return acc
          },
          {} as Record<string, Story[]>,
        )

        // Take the most recent story from each user
        const latestStories = Object.values(groupedStories).map((userStories) => {
          userStories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          return userStories[0]
        })

        // Sort by creation time (newest first)
        latestStories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setStories(latestStories)
      } catch (error) {
        console.error("Error fetching stories:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStories()
  }, [])

  const handleCreateStory = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user?.uid) return

    const file = e.target.files[0]
    setUploading(true)

    try {
      // Upload file to storage
      const fileId = uuidv4()
      const fileExtension = file.name.split(".").pop()
      const fileName = `story_${user.uid}_${fileId}.${fileExtension}`
      const fileRef = storageRef(storage, `stories/${user.uid}/${fileName}`)

      await uploadBytes(fileRef, file)
      const downloadURL = await getDownloadURL(fileRef)

      // Get user profile
      const userProfile = await getUser(user.uid)

      // Create story in database
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

      const newStoryRef = push(ref(db, "stories"))

      const storyData: Omit<Story, "id"> = {
        userId: user.uid,
        userName: userProfile?.displayName || user.displayName || "User",
        userPhotoURL: userProfile?.photoURL || user.photoURL,
        mediaURL: downloadURL,
        mediaType: file.type.startsWith("image/") ? "image" : "video",
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        viewedBy: {},
      }

      await set(newStoryRef, storyData)

      // Add to local state
      setStories((prev) => [
        {
          id: newStoryRef.key as string,
          ...storyData,
        },
        ...prev.filter((s) => s.userId !== user.uid),
      ])

      setShowCreateStory(false)
    } catch (error) {
      console.error("Error creating story:", error)
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleViewStory = (story: Story, index: number) => {
    setViewingStory(story)
    setCurrentStoryIndex(index)
    setProgress(0)

    // Mark story as viewed
    if (user?.uid && story.userId !== user.uid) {
      set(ref(db, `stories/${story.id}/viewedBy/${user.uid}`), true)
    }

    // Start progress timer
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }

    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval.current as NodeJS.Timeout)

          // Move to next story after completion
          if (currentStoryIndex < stories.length - 1) {
            handleViewStory(stories[currentStoryIndex + 1], currentStoryIndex + 1)
          } else {
            setViewingStory(null)
          }

          return 0
        }
        return prev + 1
      })
    }, 50) // 5 seconds total (50ms * 100)
  }

  const handleCloseStory = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }
    setViewingStory(null)
  }

  const handleNextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      handleViewStory(stories[currentStoryIndex + 1], currentStoryIndex + 1)
    } else {
      handleCloseStory()
    }
  }

  const handlePrevStory = () => {
    if (currentStoryIndex > 0) {
      handleViewStory(stories[currentStoryIndex - 1], currentStoryIndex - 1)
    }
  }

  const handleScroll = (direction: "left" | "right") => {
    if (storiesContainerRef.current) {
      const container = storiesContainerRef.current
      const scrollAmount = 200

      if (direction === "left") {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" })
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" })
      }
    }
  }

  const isStoryViewed = (story: Story) => {
    if (!user?.uid) return false
    return story.viewedBy && story.viewedBy[user.uid]
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-16 rounded-full flex-shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (stories.length === 0 && !user?.uid) {
    return null
  }

  return (
    <>
      <Card className="mb-6 relative">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar" ref={storiesContainerRef}>
            {user && (
              <Dialog open={showCreateStory} onOpenChange={setShowCreateStory}>
                <DialogTrigger asChild>
                  <div className="flex flex-col items-center cursor-pointer">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-primary">
                        <AvatarImage src={user.photoURL || ""} />
                        <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1">
                        <Plus className="h-3 w-3" />
                      </div>
                    </div>
                    <span className="text-xs mt-1 w-16 text-center truncate">Your Story</span>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Story</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Share a photo or video that will be visible for 24 hours.
                    </p>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleCreateStory}
                    />

                    <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full">
                      {uploading ? "Uploading..." : "Select Media"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {stories.map((story, index) => (
              <div
                key={story.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => handleViewStory(story, index)}
              >
                <Avatar className={`h-16 w-16 border-2 ${isStoryViewed(story) ? "border-gray-300" : "border-primary"}`}>
                  <AvatarImage src={story.userPhotoURL || ""} />
                  <AvatarFallback>{story.userName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-xs mt-1 w-16 text-center truncate">{story.userName}</span>
              </div>
            ))}
          </div>

          {stories.length > 4 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-background/80 rounded-full h-8 w-8"
                onClick={() => handleScroll("left")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-background/80 rounded-full h-8 w-8"
                onClick={() => handleScroll("right")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {viewingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="relative w-full max-w-lg">
            <div className="absolute top-0 left-0 right-0 p-4 z-10">
              <Progress value={progress} className="h-1" />

              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={viewingStory.userPhotoURL || ""} />
                  <AvatarFallback>{viewingStory.userName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-white">{viewingStory.userName}</p>
                  <p className="text-xs text-gray-300">
                    {formatDistanceToNow(new Date(viewingStory.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>

            {viewingStory.mediaType === "image" ? (
              <img
                src={viewingStory.mediaURL || "/placeholder.svg"}
                alt="Story"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            ) : (
              <video
                src={viewingStory.mediaURL}
                autoPlay
                muted
                loop
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={handleCloseStory}
            >
              <X className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 rounded-full h-10 w-10 text-white"
              onClick={handlePrevStory}
              disabled={currentStoryIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 rounded-full h-10 w-10 text-white"
              onClick={handleNextStory}
              disabled={currentStoryIndex === stories.length - 1}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

