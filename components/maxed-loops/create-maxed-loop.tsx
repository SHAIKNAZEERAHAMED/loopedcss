"use client"

import type React from "react"

import { useState, useRef, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X, Upload, Hash, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { createMaxedLoop } from "@/lib/maxed-loops-service"

export function CreateMaxedLoop() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState("")
  const [uploading, setUploading] = useState(false)

  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  // Handle video selection
  const handleVideoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Invalid file type",
        description: "Please select a video file",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Video must be less than 100MB",
        variant: "destructive",
      })
      return
    }

    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  // Handle thumbnail selection
  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setThumbnailFile(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  // Generate thumbnail from video
  const generateThumbnail = () => {
    if (!videoRef.current || !videoPreview) return

    const video = videoRef.current

    // Create a canvas element
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the current frame to the canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (!blob) return

        // Create a file from the blob
        const file = new File([blob], "thumbnail.jpg", { type: "image/jpeg" })

        setThumbnailFile(file)
        setThumbnailPreview(URL.createObjectURL(blob))
      },
      "image/jpeg",
      0.95,
    )
  }

  // Handle hashtag input
  const handleHashtagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault()
      addHashtag()
    }
  }

  // Add hashtag
  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "")

    if (tag && !hashtags.includes(tag) && hashtags.length < 10) {
      setHashtags([...hashtags, tag])
      setHashtagInput("")
    }
  }

  // Remove hashtag
  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag))
  }

  // Video reference for thumbnail generation
  const videoRef = useRef<HTMLVideoElement>(null)

  // Upload maxed loop
  const handleUpload = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a Maxed Loop",
        variant: "destructive",
      })
      return
    }

    if (!videoFile) {
      toast({
        title: "Video required",
        description: "Please select a video to upload",
        variant: "destructive",
      })
      return
    }

    if (!thumbnailFile) {
      toast({
        title: "Thumbnail required",
        description: "Please select or generate a thumbnail",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const result = await createMaxedLoop(user.uid, videoFile, thumbnailFile, caption, hashtags)

      if (result.success && result.maxedLoopId) {
        toast({
          title: "Maxed Loop created",
          description: "Your Maxed Loop is now being processed and moderated",
        })

        // Reset form
        setVideoFile(null)
        setThumbnailFile(null)
        setVideoPreview(null)
        setThumbnailPreview(null)
        setCaption("")
        setHashtags([])

        // Redirect to the maxed loops feed
        router.push("/maxed-loops")
      } else {
        toast({
          title: "Upload failed",
          description: result.error || "Failed to create Maxed Loop",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating maxed loop:", error)
      toast({
        title: "Upload failed",
        description: "An error occurred while creating your Maxed Loop",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-center">Create Maxed Loop</h1>

      {/* Video Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Video</label>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          {videoPreview ? (
            <div className="relative">
              <video ref={videoRef} src={videoPreview} className="w-full h-64 object-cover rounded-lg" controls />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setVideoFile(null)
                  setVideoPreview(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-64 cursor-pointer"
              onClick={() => videoInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload video (max 100MB)</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, MOV, or WebM format</p>
            </div>
          )}
          <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
        </div>
      </div>

      {/* Thumbnail */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">Thumbnail</label>
          {videoPreview && (
            <Button variant="outline" size="sm" onClick={generateThumbnail} className="text-xs">
              <Camera className="h-3 w-3 mr-1" />
              Generate from video
            </Button>
          )}
        </div>
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          {thumbnailPreview ? (
            <div className="relative">
              <img
                src={thumbnailPreview || "/placeholder.svg"}
                className="w-full h-40 object-cover rounded-lg"
                alt="Thumbnail preview"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => {
                  setThumbnailFile(null)
                  setThumbnailPreview(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center h-40 cursor-pointer"
              onClick={() => thumbnailInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload thumbnail (max 5MB)</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, or WebP format</p>
            </div>
          )}
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailChange}
          />
        </div>
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Caption</label>
        <Textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption for your Maxed Loop..."
          maxLength={150}
          className="resize-none"
        />
        <p className="text-xs text-right text-muted-foreground">{caption.length}/150</p>
      </div>

      {/* Hashtags */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Hashtags (max 10)</label>
        <div className="flex items-center">
          <Hash className="h-4 w-4 mr-2 text-muted-foreground" />
          <Input
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={handleHashtagKeyDown}
            onBlur={addHashtag}
            placeholder="Add hashtags (press Enter or Space)"
            disabled={hashtags.length >= 10}
            className="flex-1"
          />
        </div>

        {/* Hashtag list */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {hashtags.map((tag) => (
              <div key={tag} className="flex items-center bg-primary/10 text-primary rounded-full px-3 py-1 text-sm">
                #{tag}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-transparent"
                  onClick={() => removeHashtag(tag)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <Button className="w-full" disabled={!videoFile || !thumbnailFile || uploading} onClick={handleUpload}>
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          "Upload Maxed Loop"
        )}
      </Button>
    </div>
  )
}

