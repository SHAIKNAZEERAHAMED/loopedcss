"use client"

import { useState, useRef, useEffect } from "react"
import { useInView } from "react-intersection-observer"
import { Heart, MessageCircle, Share, Play, Volume2, VolumeX } from "lucide-react"
import {
  type MaxedLoop,
  likeMaxedLoop,
  hasLikedMaxedLoop,
  shareMaxedLoop,
  recordMaxedLoopView,
} from "@/lib/maxed-loops-service"
import { useAuth } from "@/contexts/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface MaxedLoopCardProps {
  maxedLoop: MaxedLoop
  onCommentClick?: (maxedLoopId: string) => void
  autoPlay?: boolean
  className?: string
}

export function MaxedLoopCard({ maxedLoop, onCommentClick, autoPlay = false, className }: MaxedLoopCardProps) {
  const { user } = useAuth()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(maxedLoop.likes)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Use intersection observer to detect when the video is in view
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.7, // 70% of the element must be visible
    triggerOnce: false,
  })

  // Check if the user has liked this maxed loop
  useEffect(() => {
    if (user) {
      hasLikedMaxedLoop(maxedLoop.id, user.uid)
        .then((hasLiked) => {
          setIsLiked(hasLiked)
        })
        .catch((error) => {
          console.error("Error checking if user has liked maxed loop:", error)
        })
    }
  }, [maxedLoop.id, user])

  // Handle autoplay when in view
  useEffect(() => {
    if (videoRef.current) {
      if (inView && autoPlay) {
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
            // Record view after 2 seconds of playback
            setTimeout(() => {
              if (user) {
                recordMaxedLoopView(maxedLoop.id, user.uid)
              } else {
                recordMaxedLoopView(maxedLoop.id)
              }
            }, 2000)
          })
          .catch((error) => {
            console.error("Error playing video:", error)
          })
      } else {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [inView, autoPlay, maxedLoop.id, user])

  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        videoRef.current
          .play()
          .then(() => {
            setIsPlaying(true)
            // Record view
            if (user) {
              recordMaxedLoopView(maxedLoop.id, user.uid)
            } else {
              recordMaxedLoopView(maxedLoop.id)
            }
          })
          .catch((error) => {
            console.error("Error playing video:", error)
          })
      }
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  // Handle like
  const handleLike = async () => {
    if (!user) {
      // Redirect to login or show login modal
      return
    }

    try {
      const liked = await likeMaxedLoop(maxedLoop.id, user.uid)
      setIsLiked(liked)
      setLikesCount((prev) => (liked ? prev + 1 : prev - 1))
    } catch (error) {
      console.error("Error liking maxed loop:", error)
    }
  }

  // Handle share
  const handleShare = async () => {
    if (!user) {
      // Redirect to login or show login modal
      return
    }

    try {
      await shareMaxedLoop(maxedLoop.id, user.uid)

      // Use Web Share API if available
      if (navigator.share) {
        await navigator.share({
          title: `${maxedLoop.username}'s Maxed Loop`,
          text: maxedLoop.caption,
          url: `/maxed-loops/${maxedLoop.id}`,
        })
      } else {
        // Fallback to copying link to clipboard
        const url = `${window.location.origin}/maxed-loops/${maxedLoop.id}`
        navigator.clipboard
          .writeText(url)
          .then(() => {
            // Show a toast or notification
            console.log("Link copied to clipboard")
          })
          .catch((err) => {
            console.error("Failed to copy link:", err)
          })
      }
    } catch (error) {
      console.error("Error sharing maxed loop:", error)
    }
  }

  // Handle comment click
  const handleCommentClick = () => {
    if (onCommentClick) {
      onCommentClick(maxedLoop.id)
    }
  }

  return (
    <div
      ref={inViewRef}
      className={cn(
        "relative flex flex-col w-full max-w-md mx-auto bg-black rounded-lg overflow-hidden",
        "h-[calc(100vh-120px)] max-h-[800px]",
        className,
      )}
    >
      {/* Video */}
      <div className="relative flex-1 bg-black">
        <video
          ref={videoRef}
          src={maxedLoop.videoUrl}
          poster={maxedLoop.thumbnailUrl}
          loop
          muted={isMuted}
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Play/Pause overlay */}
        <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
          {!isPlaying && (
            <div className="bg-black/30 rounded-full p-4">
              <Play className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        {/* Volume control */}
        <button onClick={toggleMute} className="absolute bottom-4 right-4 bg-black/50 rounded-full p-2">
          {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      </div>

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* User info */}
        <div className="flex items-center mb-2">
          <Link href={`/profile/${maxedLoop.userId}`}>
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={maxedLoop.userAvatar} alt={maxedLoop.username} />
              <AvatarFallback>{maxedLoop.username.charAt(0)}</AvatarFallback>
            </Avatar>
          </Link>
          <Link href={`/profile/${maxedLoop.userId}`} className="text-white font-medium">
            {maxedLoop.username}
          </Link>
        </div>

        {/* Caption */}
        <p className="text-white text-sm mb-2">{maxedLoop.caption}</p>

        {/* Hashtags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {maxedLoop.hashtags.map((hashtag, index) => (
            <Link key={index} href={`/explore/hashtag/${hashtag.replace(/^#/, "")}`} className="text-blue-400 text-xs">
              {hashtag.startsWith("#") ? hashtag : `#${hashtag}`}
            </Link>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="bg-black/50 text-white hover:bg-black/70 rounded-full"
          onClick={handleLike}
        >
          <Heart className={cn("w-6 h-6", isLiked && "fill-red-500 text-red-500")} />
          <span className="text-xs mt-1 text-white">{likesCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="bg-black/50 text-white hover:bg-black/70 rounded-full"
          onClick={handleCommentClick}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-xs mt-1 text-white">{maxedLoop.comments}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="bg-black/50 text-white hover:bg-black/70 rounded-full"
          onClick={handleShare}
        >
          <Share className="w-6 h-6" />
          <span className="text-xs mt-1 text-white">{maxedLoop.shares}</span>
        </Button>
      </div>
    </div>
  )
}

