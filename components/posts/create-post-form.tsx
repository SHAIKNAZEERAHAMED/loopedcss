"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { ImageIcon, Smile, Video, Send, Loader2, X, Mic, File } from "lucide-react"
import { analyzeSentiment } from "@/lib/sentiment-analysis"
import { SentimentIndicator } from "@/components/posts/sentiment-indicator"
import { createPost } from "@/lib/post-service"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { detectAbusiveContent } from "@/lib/moderation-service"
import { AudioRecorder } from "@/components/audio/audio-recorder"
import type { AudioModerationResult } from "@/lib/audio-moderation-service"
import { VideoRecorder } from "@/components/video/video-recorder"
import type { VideoModerationResult } from "@/lib/video-moderation-service"

declare global {
  interface File {
    new (fileBits: BlobPart[], fileName: string, options?: FilePropertyBag): File
  }
}

interface CreatePostFormProps {
  onPostCreated?: () => void
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sentimentPreview, setSentimentPreview] = useState<{
    emoji: string
    label: string
    color: string
  } | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([])
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioModeration, setAudioModeration] = useState<AudioModerationResult | null>(null)
  const [showVideoRecorder, setShowVideoRecorder] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoModeration, setVideoModeration] = useState<VideoModerationResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
      // Create an array of all media files
      const allMedia = [...selectedFiles]

      // If we have audio, add it to the media files
      if (audioBlob) {
        const audioFile = Object.assign(audioBlob, {
          name: "audio-recording.wav",
          type: "audio/wav",
        }) as File
        allMedia.push(audioFile)
      }

      // If we have video, add it to the media files
      if (videoBlob) {
        const videoFile = Object.assign(videoBlob, {
          name: "video-recording.webm",
          type: "video/webm",
        }) as File
        allMedia.push(videoFile)
      }

      // Create the post with all media
      await createPost(
        user.uid,
        user.displayName || "Anonymous",
        user.photoURL,
        content,
        allMedia,
        audioModeration,
      )

      // Reset form
      setContent("")
      setSelectedFiles([])
      setMediaPreviewUrls([])
      setSentimentPreview(null)
      setAudioBlob(null)
      setAudioModeration(null)
      setShowAudioRecorder(false)
      setVideoBlob(null)
      setVideoModeration(null)
      setShowVideoRecorder(false)

      // Notify parent
      onPostCreated?.()

      toast({
        title: "Post created",
        description: "Your post has been published successfully.",
      })
    } catch (error) {
      console.error("Error creating post:", error)
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const analyzePostSentiment = async (text: string) => {
    if (text.length > 10) {
      // Reduced threshold to 10 characters for testing
      try {
        const sentiment = await analyzeSentiment(text)
        setSentimentPreview({
          emoji: sentiment.emoji,
          label: sentiment.label,
          color: sentiment.color,
        })

        // Also check for abusive content
        const moderationResult = await detectAbusiveContent(text)

        if (moderationResult.isAbusive) {
          toast({
            title: "Content Warning",
            description: `Your post may contain inappropriate content (${moderationResult.categories.join(", ")}). Please review before posting.`,
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error analyzing sentiment:", error)
        setSentimentPreview(null)
      }
    } else {
      setSentimentPreview(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video") => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)

      // Filter files based on type
      const filteredFiles = newFiles.filter((file) => {
        if (type === "image") return file.type.startsWith("image/")
        if (type === "video") return file.type.startsWith("video/")
        return false
      })

      // Check if adding new files would exceed limit
      if (selectedFiles.length + filteredFiles.length > 4) {
        toast({
          title: "Too many files",
          description: "You can only upload up to 4 media files per post.",
          variant: "destructive",
        })
        return
      }

      // Add new files to state
      setSelectedFiles((prev) => [...prev, ...filteredFiles])

      // Create preview URLs for new files
      const newPreviewUrls = filteredFiles.map((file) => URL.createObjectURL(file))
      setMediaPreviewUrls((prev) => [...prev, ...newPreviewUrls])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))

    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(mediaPreviewUrls[index])
    setMediaPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAudioModerated = (result: AudioModerationResult, blob: Blob) => {
    setAudioModeration(result)
    setAudioBlob(blob)
  }

  const handleVideoModerated = (result: VideoModerationResult, blob: Blob) => {
    setVideoModeration(result)
    setVideoBlob(blob)
  }

  const userInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar>
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder={`What's on your mind, ${user?.displayName?.split(" ")[0]}?`}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  analyzePostSentiment(e.target.value)
                }}
                className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 shadow-none"
              />
              {sentimentPreview && (
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <SentimentIndicator
                    sentiment={{
                      score: 0,
                      label: sentimentPreview.label as "positive" | "neutral" | "negative",
                      confidence: 0.8,
                      emoji: sentimentPreview.emoji,
                      color: sentimentPreview.color,
                    }}
                    showLabel={true}
                  />
                  <span>tone detected in your post</span>
                </div>
              )}

              {/* Media Previews */}
              {mediaPreviewUrls.length > 0 && (
                <div className={`grid gap-2 mt-4 ${mediaPreviewUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {mediaPreviewUrls.map((url, index) => (
                    <div key={index} className="relative rounded-md overflow-hidden">
                      {selectedFiles[index]?.type.startsWith("image/") ? (
                        <Image
                          src={url || "/placeholder.svg"}
                          alt={`Preview ${index}`}
                          width={300}
                          height={300}
                          className="w-full h-auto max-h-[300px] object-cover rounded-md"
                        />
                      ) : (
                        <video src={url} controls className="w-full h-auto max-h-[300px] object-cover rounded-md" />
                      )}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-80 hover:opacity-100"
                        onClick={() => removeFile(index)}
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Audio Recorder */}
              {showAudioRecorder && (
                <div className="mt-4">
                  <AudioRecorder
                    onAudioModerated={handleAudioModerated}
                    userId={user?.uid || ""}
                    contextData={{ postText: content }}
                  />

                  {audioBlob && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="bg-muted rounded-md px-3 py-2 text-sm flex items-center gap-2 flex-1">
                        <Mic className="h-4 w-4" />
                        <span>Audio recording added</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setAudioBlob(null)
                          setAudioModeration(null)
                          setShowAudioRecorder(false)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Video Recorder */}
              {showVideoRecorder && (
                <div className="mt-4">
                  <VideoRecorder
                    onVideoModerated={handleVideoModerated}
                    userId={user?.uid || ""}
                    contextData={{ postText: content }}
                  />

                  {videoBlob && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="bg-muted rounded-md px-3 py-2 text-sm flex items-center gap-2 flex-1">
                        <Video className="h-4 w-4" />
                        <span>Video recording added</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setVideoBlob(null)
                          setVideoModeration(null)
                          setShowVideoRecorder(false)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {videoModeration && videoModeration.cringe.isCringe && (
                    <div className="mt-2 text-xs text-purple-500 bg-purple-50 p-2 rounded-md">
                      This video contains content that may be considered "cringe" by some viewers.
                    </div>
                  )}

                  {videoModeration && videoModeration.ageRestriction.isRestricted && (
                    <div className="mt-2 text-xs text-amber-500 bg-amber-50 p-2 rounded-md">
                      This video will be age-restricted: {videoModeration.ageRestriction.reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => handleFileSelect(e, "image")}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-share"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Photo</span>
            </Button>

            <input
              type="file"
              ref={videoInputRef}
              className="hidden"
              accept="video/*"
              multiple
              onChange={(e) => handleFileSelect(e, "video")}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-connect"
              onClick={() => videoInputRef.current?.click()}
            >
              <Video className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Video</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-safe"
              onClick={() => setShowAudioRecorder(!showAudioRecorder)}
            >
              <Mic className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Audio</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-connect"
              onClick={() => setShowVideoRecorder(!showVideoRecorder)}
            >
              <Video className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Video</span>
            </Button>

            <Button type="button" variant="ghost" size="sm" className="text-safe">
              <Smile className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Feeling</span>
            </Button>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              type="submit"
              className="share-bg hover:bg-opacity-90"
              disabled={(!content.trim() && selectedFiles.length === 0 && !audioBlob) || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </form>
    </Card>
  )
}

