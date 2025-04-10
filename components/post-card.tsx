"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Post, likePost, savePost } from "@/lib/post-service"
import { ref, get } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { shouldShowContent, getContentWarning } from "@/lib/moderation-service"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [likeCount, setLikeCount] = useState(typeof post.likes === 'number' ? post.likes : 0)
  const [isContentSafe] = useState(() => shouldShowContent(post.content))
  const [contentWarning] = useState(() => getContentWarning(post.content))
  const [showContent, setShowContent] = useState(isContentSafe)

  useEffect(() => {
    async function checkInteractions() {
      if (user) {
        try {
          const [likeSnapshot, saveSnapshot] = await Promise.all([
            get(ref(db, `postLikes/${post.id}/${user.uid}`)),
            get(ref(db, `savedPosts/${user.uid}/${post.id}`))
          ])
          setLiked(likeSnapshot.exists())
          setSaved(saveSnapshot.exists())
        } catch (error) {
          console.error("Error checking interactions:", error)
        }
      }
      setLoading(false)
    }

    checkInteractions()
  }, [post.id, user])

  const handleLike = async () => {
    if (!user || loading) return

    try {
      setLoading(true)
      await likePost(post.id, user.uid)
      setLiked(!liked)
      setLikeCount(prev => liked ? prev - 1 : prev + 1)
    } catch (error) {
      console.error("Error liking post:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || loading) return

    try {
      setLoading(true)
      await savePost(post.id, user.uid)
      setSaved(!saved)
    } catch (error) {
      console.error("Error saving post:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link href={`/profile/${post.authorId}`}>
            <Avatar className="cursor-pointer h-12 w-12">
              <AvatarImage src={post.authorPhotoURL || ""} alt={post.authorName} />
              <AvatarFallback>{post.authorName[0]}</AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link href={`/profile/${post.authorId}`}>
              <p className="font-semibold hover:underline">{post.authorName}</p>
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        
        {!isContentSafe && !showContent ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {contentWarning || "This content may be inappropriate"}
              </AlertDescription>
            </Alert>
            <Button 
              variant="outline" 
              onClick={() => setShowContent(true)}
              className="w-full"
            >
              Show Content Anyway
            </Button>
          </div>
        ) : (
          <p className="text-lg whitespace-pre-wrap">{post.content}</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4 pb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={loading || !user}
            className={cn("hover:text-red-500", liked && "text-red-500")}
          >
            {liked ? <Icons.heartFilled className="h-5 w-5" /> : <Icons.heart className="h-5 w-5" />}
            <span className="ml-2">{likeCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={loading || !user}
            className={cn("hover:text-blue-500", saved && "text-blue-500")}
          >
            {saved ? <Icons.bookmarkFilled className="h-5 w-5" /> : <Icons.bookmark className="h-5 w-5" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
} 