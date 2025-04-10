"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Video, X, Check, AlertTriangle } from "lucide-react"
import { moderateVideoContent, type VideoModerationResult } from "@/lib/video-moderation-service"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface VideoRecorderProps {
  userId: string
  onVideoModerated: (result: VideoModerationResult, blob: Blob) => void
  contextData?: {
    postText?: string
    isChildContent?: boolean
  }
}

export function VideoRecorder({ userId, onVideoModerated, contextData }: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [moderationResult, setModerationResult] = useState<VideoModerationResult | null>(null)
  const [videoTitle, setVideoTitle] = useState("")
  const [videoDescription, setVideoDescription] = useState("")
  const [videoTags, setVideoTags] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const startRecording = async () => {
    try {
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        const url = URL.createObjectURL(blob)

        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.src = url
          videoRef.current.controls = true
        }

        setRecordedBlob(blob)
        setPreviewUrl(url)
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      let seconds = 0
      timerRef.current = setInterval(() => {
        seconds++
        setRecordingTime(seconds)

        // Limit recording to 2 minutes
        if (seconds >= 120) {
          stopRecording()
        }
      }, 1000)
    } catch (error) {
      console.error("Error starting video recording:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }

  const resetRecording = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.src = ""
      videoRef.current.controls = false
    }

    setRecordedBlob(null)
    setRecordingTime(0)
    setIsRecording(false)
    setModerationResult(null)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }

    setSelectedFile(null)
    setVideoTitle("")
    setVideoDescription("")
    setVideoTags("")
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]

      // Check if file is a video
      if (!file.type.startsWith("video/")) {
        alert("Please select a video file")
        return
      }

      // Check file size (limit to 100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert("Video file is too large. Maximum size is 100MB")
        return
      }

      setSelectedFile(file)

      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      if (videoRef.current) {
        videoRef.current.src = url
        videoRef.current.controls = true
      }
    }
  }

  const processVideo = async () => {
    const videoToProcess = selectedFile || recordedBlob

    if (!videoToProcess || !userId) return

    try {
      setIsProcessing(true)
      setProcessingProgress(0)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => {
          const newProgress = prev + Math.random() * 10
          return newProgress > 90 ? 90 : newProgress
        })
      }, 500)

      // Convert Blob to File if needed
      const videoFile =
        selectedFile ||
        new File([videoToProcess], "recorded-video.webm", {
          type: videoToProcess.type,
        })

      // Process tags
      const tags = videoTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      // Moderate video content
      const result = await moderateVideoContent(videoFile, userId, {
        title: videoTitle,
        description: videoDescription,
        tags,
        isChildContent: contextData?.isChildContent,
      })

      clearInterval(progressInterval)
      setProcessingProgress(100)

      setModerationResult(result)

      // Notify parent component
      onVideoModerated(result, videoToProcess)
    } catch (error) {
      console.error("Error processing video:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        {/* Video Preview */}
        <div className="relative bg-muted rounded-md overflow-hidden aspect-video">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

          {!recordedBlob && !selectedFile && !isRecording && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Video className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Record a video or upload a file</p>
            </div>
          )}

          {isRecording && (
            <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center">
              <span className="h-2 w-2 rounded-full bg-white mr-1 animate-pulse" />
              {formatTime(recordingTime)}
            </div>
          )}
        </div>

        {/* Recording Controls */}
        {!recordedBlob && !selectedFile && (
          <div className="flex justify-center gap-4">
            <Button type="button" onClick={startRecording} disabled={isRecording} className="gap-2">
              <Video className="h-4 w-4" />
              Record Video
            </Button>

            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              Upload Video
            </Button>

            <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileSelect} />
          </div>
        )}

        {/* Recording in Progress */}
        {isRecording && (
          <div className="flex justify-center">
            <Button type="button" variant="destructive" onClick={stopRecording} className="gap-2">
              <X className="h-4 w-4" />
              Stop Recording
            </Button>
          </div>
        )}

        {/* Video Metadata */}
        {(recordedBlob || selectedFile) && !isProcessing && !moderationResult && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-title">Video Title</Label>
              <Input
                id="video-title"
                placeholder="Enter a title for your video"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-description">Description</Label>
              <Textarea
                id="video-description"
                placeholder="Describe your video"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-tags">Tags (comma separated)</Label>
              <Input
                id="video-tags"
                placeholder="funny, vlog, tutorial"
                value={videoTags}
                onChange={(e) => setVideoTags(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetRecording}>
                Cancel
              </Button>

              <Button type="button" onClick={processVideo}>
                Process Video
              </Button>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing video...</span>
            </div>

            <Progress value={processingProgress} className="h-2" />

            <p className="text-xs text-muted-foreground">
              We're analyzing your video for content moderation. This may take a moment.
            </p>
          </div>
        )}

        {/* Moderation Result */}
        {moderationResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {moderationResult.moderationDecision === "approved" ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : moderationResult.moderationDecision === "rejected" ? (
                <X className="h-5 w-5 text-red-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}

              <span className="font-medium">
                {moderationResult.moderationDecision === "approved"
                  ? "Video approved"
                  : moderationResult.moderationDecision === "rejected"
                    ? "Video rejected"
                    : "Video needs review"}
              </span>
            </div>

            {moderationResult.ageRestriction.isRestricted && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-amber-800 text-sm font-medium">
                  Age Restricted: {moderationResult.ageRestriction.reason}
                </p>
                <p className="text-amber-700 text-xs">
                  This content is restricted to users {moderationResult.ageRestriction.minimumAge}+
                </p>
              </div>
            )}

            {moderationResult.cringe.isCringe && (
              <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                <p className="text-purple-800 text-sm font-medium">Cringe Detection</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {moderationResult.cringe.cringeFactors.map((factor, index) => (
                    <Badge key={index} variant="outline" className="bg-purple-100 text-purple-800">
                      {factor.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={resetRecording}>
                Record Another Video
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

