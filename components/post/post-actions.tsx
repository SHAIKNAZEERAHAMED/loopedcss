"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share2, Bookmark, BookmarkCheck } from "lucide-react"
import { savePost, unsavePost, isPostSaved } from "@/lib/services/saved-posts-service"

interface PostActionsProps {
  postId: string
  likes: number
  comments: number
  shares: number
  onLike?: () => void
  onComment?: () => void
  onShare?: () => void
}

export function PostActions({ postId, likes, comments, shares, onLike, onComment, onShare }: PostActionsProps) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(likes)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (user) {
        const isSaved = await isPostSaved(user.uid, postId)
        setSaved(isSaved)
      }
    }

    checkSavedStatus()
  }, [user, postId])

  const handleLike = () => {
    if (!user) return

    setLiked(!liked)
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1))

    if (onLike) {
      onLike()
    }
  }

  const handleSave = async () => {
    if (!user) return
    setLoading(true)

    try {
      if (saved) {
        await unsavePost(user.uid, postId)
        setSaved(false)
      } else {
        await savePost(user.uid, postId)
        setSaved(true)
      }
    } catch (error) {
      console.error("Error toggling save status:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex justify-between items-center pt-2">
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm" className={`px-2 ${liked ? "text-red-500" : ""}`} onClick={handleLike}>
          <Heart className={`h-5 w-5 mr-1 ${liked ? "fill-red-500" : ""}`} />
          <span>{likeCount}</span>
        </Button>

        <Button variant="ghost" size="sm" className="px-2" onClick={onComment}>
          <MessageCircle className="h-5 w-5 mr-1" />
          <span>{comments}</span>
        </Button>

        <Button variant="ghost" size="sm" className="px-2" onClick={onShare}>
          <Share2 className="h-5 w-5 mr-1" />
          <span>{shares}</span>
        </Button>
      </div>

      <Button variant="ghost" size="sm" className="px-2" onClick={handleSave} disabled={loading}>
        {saved ? <BookmarkCheck className="h-5 w-5 fill-primary" /> : <Bookmark className="h-5 w-5" />}
      </Button>
    </div>
  )
}

