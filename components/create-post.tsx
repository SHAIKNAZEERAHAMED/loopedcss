"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { createPost } from "@/lib/post-service"
import { moderateContent } from "@/lib/moderation-service"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface CreatePostProps {
  onPostCreated?: () => void
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [contentWarning, setContentWarning] = useState<string | null>(null)

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    
    // Check content as user types
    const moderationResult = moderateContent(newContent)
    setContentWarning(moderationResult.isSafe ? null : moderationResult.reason || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Final moderation check before submission
    const moderationResult = moderateContent(content)
    if (!moderationResult.isSafe) {
      toast({
        title: "Content not allowed",
        description: moderationResult.reason || "This content violates our community guidelines.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      await createPost(
        user.uid,
        user.displayName || "Anonymous",
        user.photoURL,
        content.trim()
      )
      setContent("")
      setContentWarning(null)
      toast({
        title: "Success",
        description: "Your post has been created!",
      })
      onPostCreated?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={handleContentChange}
            className={cn(
              "min-h-[100px] resize-none text-lg",
              contentWarning && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={isLoading}
          />
          {contentWarning && (
            <Alert variant="destructive" className="animate-fade-in">
              <AlertDescription className="flex items-center gap-2">
                <Icons.alertTriangle className="h-4 w-4" />
                {contentWarning}
              </AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isLoading || !content.trim() || !!contentWarning}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 