"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import {
  type MaxedLoopComment,
  getMaxedLoopComments,
  commentOnMaxedLoop,
  getMaxedLoop,
} from "@/lib/maxed-loops-service"
import { formatDistanceToNow } from "date-fns"

interface MaxedLoopCommentsProps {
  maxedLoopId: string
  onClose: () => void
}

export function MaxedLoopComments({ maxedLoopId, onClose }: MaxedLoopCommentsProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<MaxedLoopComment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [maxedLoopTitle, setMaxedLoopTitle] = useState("")
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      setLoading(true)
      try {
        // Get the maxed loop details
        const maxedLoop = await getMaxedLoop(maxedLoopId)
        if (maxedLoop) {
          setMaxedLoopTitle(`${maxedLoop.username}'s Maxed Loop`)
        }

        // Get comments
        const loadedComments = await getMaxedLoopComments(maxedLoopId, 50)
        setComments(loadedComments)
      } catch (error) {
        console.error("Error loading comments:", error)
      } finally {
        setLoading(false)
      }
    }

    loadComments()
  }, [maxedLoopId])

  // Focus the comment input when the sheet opens
  useEffect(() => {
    if (commentInputRef.current) {
      setTimeout(() => {
        commentInputRef.current?.focus()
      }, 300)
    }
  }, [])

  // Submit a comment
  const handleSubmitComment = async () => {
    if (!user || !commentText.trim()) return

    setSubmitting(true)
    try {
      const result = await commentOnMaxedLoop(maxedLoopId, user.uid, commentText.trim())

      if (result.success && result.commentId) {
        // Optimistically add the comment to the list
        const newComment: MaxedLoopComment = {
          id: result.commentId,
          maxedLoopId,
          userId: user.uid,
          username: user.displayName || "Anonymous",
          userAvatar: user.photoURL || "/placeholder.svg?height=40&width=40",
          text: commentText.trim(),
          likes: 0,
          createdAt: Date.now(),
          isApproved: true, // Optimistically assume it's approved
        }

        setComments((prev) => [newComment, ...prev])
        setCommentText("")
      }
    } catch (error) {
      console.error("Error submitting comment:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] sm:max-w-md sm:h-[90vh] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>{maxedLoopTitle || "Comments"}</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Comments list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.userAvatar} alt={comment.username} />
                    <AvatarFallback>{comment.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{comment.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{comment.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-muted-foreground">No comments yet</p>
                <p className="text-sm text-muted-foreground">Be the first to comment!</p>
              </div>
            )}
          </div>

          {/* Comment input */}
          {user ? (
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.photoURL || "/placeholder.svg?height=40&width=40"}
                    alt={user.displayName || "User"}
                  />
                  <AvatarFallback>{user.displayName ? user.displayName.charAt(0) : "U"}</AvatarFallback>
                </Avatar>
                <Input
                  ref={commentInputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitComment()
                    }
                  }}
                />
                <Button size="icon" disabled={!commentText.trim() || submitting} onClick={handleSubmitComment}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 border-t text-center">
              <p className="text-sm text-muted-foreground">Please sign in to comment</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

