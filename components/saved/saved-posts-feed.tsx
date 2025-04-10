"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { getSavedPosts } from "@/lib/saved-posts-service"
import { Post } from "@/components/post/post"
import { SavedPostsEmptyState } from "./saved-posts-empty-state"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

export function SavedPostsFeed() {
  const { user } = useAuth()
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    async function fetchSavedPosts() {
      if (!user?.uid) return

      try {
        setLoading(true)
        const posts = await getSavedPosts(user.uid)
        setSavedPosts(posts.map((savedPost) => savedPost.postData))
      } catch (error) {
        console.error("Error fetching saved posts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSavedPosts()
  }, [user?.uid])

  // Filter posts based on active tab
  const filteredPosts = savedPosts.filter((post) => {
    if (activeTab === "all") return true
    if (activeTab === "images" && post.imageUrl) return true
    if (activeTab === "videos" && post.videoUrl) return true
    if (activeTab === "audio" && post.audioUrl) return true
    if (activeTab === "text" && !post.imageUrl && !post.videoUrl && !post.audioUrl) return true
    return false
  })

  if (loading) {
    return <SavedPostsSkeleton />
  }

  if (savedPosts.length === 0) {
    return <SavedPostsEmptyState />
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <SavedPostsList posts={filteredPosts} />
        </TabsContent>

        <TabsContent value="images" className="mt-6">
          <SavedPostsList posts={filteredPosts} />
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <SavedPostsList posts={filteredPosts} />
        </TabsContent>

        <TabsContent value="audio" className="mt-6">
          <SavedPostsList posts={filteredPosts} />
        </TabsContent>

        <TabsContent value="text" className="mt-6">
          <SavedPostsList posts={filteredPosts} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SavedPostsList({ posts }: { posts: any[] }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No saved posts in this category</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <Post key={post.id} post={post} showSavedBadge />
      ))}
    </div>
  )
}

function SavedPostsSkeleton() {
  return (
    <div className="space-y-6 mt-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-card rounded-lg p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-40 w-full rounded-md" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

