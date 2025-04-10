"use client"

import { useState, useEffect, useRef } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { PostActions } from "./post-actions"
import { AIResponse } from "./ai-response"
import { SentimentIndicator } from "./sentiment-indicator"
import { HateSpeechWarning } from "./hate-speech-warning"
import { analyzeSentiment, type SentimentResult } from "@/lib/ml/sentiment-analysis-service"
import { detectHateSpeech, type HateSpeechResult } from "@/lib/ml/hate-speech-detection-service"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { isLiked, unlikePost, likePost } from "@/lib/firebase/posts"

interface PostProps {
  post: {
    id: string
    authorId: string
    authorName: string
    authorPhotoURL?: string
    content: string
    createdAt: string
    likesCount: number
    commentsCount: number
    mediaURLs?: string[]
    mediaTypes?: string[]
    hasAudio?: boolean
    audioURL?: string
    audioTranscript?: string
    audioModerationResult?: {
      isSafe: boolean
      allowedRoasting?: boolean
    }
    sentiment?: {
      score: number
      label: string
    }
    isSafe?: boolean
    safetyCategory?: string
    safetyConfidence?: number
  }
  showSavedBadge?: boolean
}

export function Post({ post, showSavedBadge }: PostProps) {
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null)
  const [hateSpeechResult, setHateSpeechResult] = useState<HateSpeechResult | null>(null)
  const [showContent, setShowContent] = useState(true)
  const [showAIResponse, setShowAIResponse] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount || 0)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    async function analyzeContent() {
      try {
        setIsLoading(true)

        // Analyze sentiment
        const sentimentResult = await analyzeSentiment(post.content)
        setSentiment(sentimentResult)

        // Detect hate speech
        const hateSpeechResult = await detectHateSpeech(post.content)
        setHateSpeechResult(hateSpeechResult)

        // Hide content if it's hate speech with high severity
        if (hateSpeechResult.isHateSpeech && hateSpeechResult.severity === "high") {
          setShowContent(false)
        }
      } catch (error) {
        console.error("Error analyzing content:", error)
      } finally {
        setIsLoading(false)
      }
    }

    analyzeContent()
  }, [post.content])

  useEffect(() => {
    // Check if the current user has liked this post
    const checkLikeStatus = async () => {
      if (user) {
        try {
          const hasLiked = await isLiked(post.id, user.uid)
          setLiked(hasLiked)
        } catch (error) {
          console.error("Error checking like status:", error)
        }
      }
    }

    checkLikeStatus()
  }, [post.id, user])

  const handleLikeToggle = async () => {
    if (!user || isLikeLoading) return

    setIsLikeLoading(true)

    try {
      if (liked) {
        await unlikePost(post.id, user.uid)
        setLiked(false)
        setLikesCount((prev) => Math.max(prev - 1, 0))
      } else {
        await likePost(post.id, user.uid)
        setLiked(true)
        setLikesCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
    } finally {
      setIsLikeLoading(false)
    }
  }

  const handleProfileClick = () => {
    router.push(`/profile/${post.authorId}`)
  }

  const formattedDate = post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : "Recently"

  const authorInitials = post.authorName
    ? post.authorName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const handleSave = (newSavedState: boolean) => {
    // Implementation of handleSave function
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src={post.authorPhotoURL || "/placeholder.svg"} alt={post.authorName} />
              <AvatarFallback>{authorInitials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{post.authorName}</div>
              <div className="text-sm text-muted-foreground">@{post.authorName.split(" ").map((n) => n.toLowerCase()).join(".")}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {sentiment && <SentimentIndicator sentiment={sentiment} />}
            <div className="text-sm text-muted-foreground">{formattedDate}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        {hateSpeechResult && hateSpeechResult.isHateSpeech && !showContent ? (
          <HateSpeechWarning
            result={hateSpeechResult}
            content={post.content}
            onDismiss={() => setShowContent(false)}
            onReveal={() => setShowContent(true)}
          />
        ) : (
          <>
            <div className="mb-2">{post.content}</div>
            {post.mediaURLs && post.mediaTypes && post.mediaURLs.map((url, index) => (
              <div key={index} className="mt-2">
                {post.mediaTypes?.[index] === "image" && (
                  <img
                    src={url || "/placeholder.svg"}
                    alt={`Post media ${index + 1}`}
                    className="rounded-md w-full object-cover max-h-96"
                  />
                )}
                {post.mediaTypes?.[index] === "video" && <video src={url} controls className="rounded-md w-full max-h-96" />}
                {post.mediaTypes?.[index] === "audio" && <audio src={url} controls className="w-full mt-2" />}
              </div>
            ))}
          </>
        )}

        {showAIResponse && <AIResponse postContent={post.content} />}
      </CardContent>
      <CardFooter>
        <PostActions
          postId={post.id}
          likes={likesCount}
          comments={post.commentsCount}
          shares={0}
          onLike={handleLikeToggle}
          onComment={() => router.push(`/post/${post.id}`)}
          onShare={() => {/* TODO: Implement share functionality */}}
        />
      </CardFooter>
    </Card>
  )
}

