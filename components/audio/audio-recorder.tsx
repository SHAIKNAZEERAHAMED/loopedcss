"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, Square, Play, Pause, Upload, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { moderateAudioContent, type AudioModerationResult } from "@/lib/audio-moderation-service"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AudioRecorderProps {
  onAudioModerated: (result: AudioModerationResult, audioBlob: Blob) => void
  userId: string
  contextData?: { postText?: string; loopCategory?: string }
}

export function AudioRecorder({ onAudioModerated, userId, contextData }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [moderationResult, setModerationResult] = useState<AudioModerationResult | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const { toast } = useToast()

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      // Reset state
      setAudioBlob(null)
      setModerationResult(null)
      audioChunksRef.current = []

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" })
        setAudioBlob(audioBlob)

        // Create audio element for playback
        if (audioRef.current) {
          const audioUrl = URL.createObjectURL(audioBlob)
          audioRef.current.src = audioUrl
        }

        // Stop all tracks in the stream
        stream.getTracks().forEach((track) => track.stop())
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
      console.error("Error starting recording:", error)
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const processAudio = async () => {
    if (!audioBlob || !userId) return

    setIsProcessing(true)

    try {
      // Convert blob to file
      const audioFile = new File([audioBlob], "recording.wav", { type: "audio/wav" })

      // Send for moderation
      const result = await moderateAudioContent(audioFile, userId, contextData)

      setModerationResult(result)
      onAudioModerated(result, audioBlob)

      // Show toast based on moderation result
      if (result.isSafe) {
        toast({
          title: "Audio Approved",
          description: "Your audio content passed moderation checks.",
        })
      } else {
        toast({
          title: "Audio Flagged",
          description: "Your audio content has been flagged for review.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error processing audio:", error)
      toast({
        title: "Processing Error",
        description: "Failed to process audio. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Audio Recording</h3>
            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="animate-pulse text-red-500">●</span>
                <span>{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-2">
            {!isRecording && !audioBlob && (
              <Button onClick={startRecording} className="gap-2">
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <Button onClick={stopRecording} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            )}

            {audioBlob && (
              <>
                <Button onClick={togglePlayback} variant="outline" className="gap-2">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>

                <Button onClick={processAudio} disabled={isProcessing || !!moderationResult} className="gap-2">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Process Audio
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Hidden audio element for playback */}
          <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

          {isProcessing && (
            <div className="space-y-2">
              <p className="text-sm text-center">Analyzing audio content...</p>
              <Progress value={45} className="h-2" />
            </div>
          )}

          {moderationResult && (
            <Alert variant={moderationResult.isSafe ? "default" : "destructive"}>
              <div className="flex items-start gap-2">
                {moderationResult.isSafe ? (
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                )}
                <div>
                  <AlertTitle>{moderationResult.isSafe ? "Audio Approved" : "Audio Flagged"}</AlertTitle>
                  <AlertDescription className="text-sm">
                    {moderationResult.isSafe ? (
                      moderationResult.allowedRoasting ? (
                        "Your content contains roasting but is within acceptable limits."
                      ) : (
                        "Your audio content passed all moderation checks."
                      )
                    ) : (
                      <div className="space-y-1">
                        <p>Your audio content has been flagged for the following reasons:</p>
                        <ul className="list-disc list-inside text-xs">
                          {moderationResult.flaggedContent.abusiveLanguage.length > 0 && (
                            <li>Potentially abusive language detected</li>
                          )}
                          {moderationResult.flaggedContent.misinformation.length > 0 && (
                            <li>Potential misinformation detected</li>
                          )}
                          {moderationResult.flaggedContent.unauthorizedApps.length > 0 && (
                            <li>Promotion of unauthorized apps detected</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

