"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Mic, Play, Pause } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/components/auth/auth-provider"
import { type Post as PostType, likePost, unlikePost, isLiked } from "@/lib/post-service"
import { SentimentIndicator } from "@/components/posts/sentiment-indicator"
import { motion } from "framer-motion"
import Image from "next/image"

interface PostProps {
  post: PostType
  showSavedBadge?: boolean
}

export function Post({ post, showSavedBadge }: PostProps) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount || 0)
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  // Determine media layout based on number of media items
  const getMediaLayout = () => {
    if (!post.mediaURLs || post.mediaURLs.length === 0) return null

    const mediaCount = post.mediaURLs.length

    return (
      <div className={`grid gap-2 mt-4 ${mediaCount > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {post.mediaURLs.map((url, index) => {
          const isImage = post.mediaTypes?.[index] === "image"

          return (
            <div key={index} className="relative rounded-md overflow-hidden">
              {isImage ? (
                <Image
                  src={url || "/placeholder.svg"}
                  alt={`Media ${index + 1}`}
                  width={600}
                  height={400}
                  className="w-full h-auto max-h-[400px] object-cover rounded-md"
                />
              ) : (
                <video src={url} controls className="w-full h-auto max-h-[400px] object-cover rounded-md" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const toggleAudio = () => {
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

  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <Avatar className="cursor-pointer" onClick={handleProfileClick}>
              <AvatarImage src={post.authorPhotoURL || ""} />
              <AvatarFallback>{authorInitials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold cursor-pointer hover:underline" onClick={handleProfileClick}>
                {post.authorName}
              </div>
              <div className="text-xs text-muted-foreground">{formattedDate}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="whitespace-pre-wrap">{post.content}</div>

        {post.sentiment && (
          <div className="mt-2">
            <SentimentIndicator sentiment={post.sentiment} />
          </div>
        )}

        {getMediaLayout()}
        {post.hasAudio && post.audioURL && (
          <div className="mt-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full" onClick={toggleAudio}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <div className="text-sm font-medium">Audio Recording</div>
                {post.audioTranscript && (
                  <div className="text-xs text-muted-foreground line-clamp-1">{post.audioTranscript}</div>
                )}
              </div>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </div>
            <audio ref={audioRef} src={post.audioURL} onEnded={handleAudioEnded} className="hidden" />

            {post.audioModerationResult && !post.audioModerationResult.isSafe && (
              <div className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded-md">
                This audio content has been flagged and is pending review.
              </div>
            )}

            {post.audioModerationResult && post.audioModerationResult.allowedRoasting && (
              <div className="mt-2 text-xs text-amber-500 bg-amber-50 p-2 rounded-md">
                This audio contains roasting content within acceptable limits.
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <div className="w-full">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-muted-foreground">
              {likesCount > 0 && `${likesCount} ${likesCount === 1 ? "like" : "likes"}`}
            </div>
            <div className="text-sm text-muted-foreground">
              {post.commentsCount > 0 && `${post.commentsCount} ${post.commentsCount === 1 ? "comment" : "comments"}`}
            </div>
          </div>
          <Separator />
          <div className="flex justify-between pt-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${liked ? "text-red-500" : ""}`}
                onClick={handleLikeToggle}
                disabled={isLikeLoading}
              >
                <Heart className={`h-5 w-5 ${liked ? "fill-red-500" : ""}`} />
                Like
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="gap-2">
                <MessageCircle className="h-5 w-5" />
                Comment
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="gap-2">
                <Share2 className="h-5 w-5" />
                Share
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="sm" className="gap-2">
                <Bookmark className="h-5 w-5" />
                Save
              </Button>
            </motion.div>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

