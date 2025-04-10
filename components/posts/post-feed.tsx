"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { Post } from "@/components/posts/post"
import { CreatePostForm } from "@/components/posts/create-post-form"
import { Loader2 } from "lucide-react"
import { type Post as PostType, subscribeToFeed } from "@/lib/post-service"

export function PostFeed() {
  const [posts, setPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Subscribe to posts in real-time
    const unsubscribe = subscribeToFeed((newPosts) => {
      setPosts(newPosts)
      setLoading(false)
    }, 20)

    return () => unsubscribe()
  }, [user])

  const handlePostCreated = () => {
    // No need to manually update posts, the subscription will handle it
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CreatePostForm onPostCreated={handlePostCreated} />

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">No posts yet. Be the first to share something!</p>
        </div>
      ) : (
        posts.map((post) => <Post key={post.id} post={post} />)
      )}
    </div>
  )
}

