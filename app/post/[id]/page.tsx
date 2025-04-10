"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Post } from "@/components/posts/post"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import { subscribeToPost, type Post as PostType } from "@/lib/post-service"

export default function SinglePostPage() {
  const { id } = useParams()
  const postId = Array.isArray(id) ? id[0] : id
  const [post, setPost] = useState<PostType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!postId) return

    const unsubscribe = subscribeToPost(postId, (postData) => {
      setPost(postData)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [postId])

  const handleBack = () => {
    router.back()
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4">
        <Button variant="ghost" onClick={handleBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : post ? (
          <div>
            <Post post={post} />
          </div>
        ) : (
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
            <p className="text-muted-foreground">The post you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push("/dashboard")} className="mt-6">
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

