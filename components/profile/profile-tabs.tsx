"use client"

import Link from "next/link"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/contexts/auth-context"
import { useState, useEffect } from "react"
import { TabsContent } from "@/components/ui/tabs"
import { getUserPosts } from "@/lib/post-service"
import { getSavedPosts } from "@/lib/saved-posts-service"
import { Post } from "@/components/post/post"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileAnalytics } from "./profile-analytics"
import { ProfileMedia } from "./profile-media"

interface ProfileTabsProps {
  activeTab: string
  userId: string
  user: any
}

export function ProfileTabs({ activeTab, userId, user }: ProfileTabsProps) {
  const { user: currentUser } = useAuth()
  const isCurrentUser = currentUser?.uid === user.id
  const [posts, setPosts] = useState<any[]>([])
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true)
        const userPosts = await getUserPosts(user.id)
        setPosts(userPosts)
      } catch (error) {
        console.error("Error fetching user posts:", error)
      } finally {
        setLoading(false)
      }
    }

    async function fetchSavedPosts() {
      if (!isCurrentUser || !currentUser?.uid) return

      try {
        const saved = await getSavedPosts(currentUser.uid)
        setSavedPosts(saved.map((savedPost) => savedPost.postData))
      } catch (error) {
        console.error("Error fetching saved posts:", error)
      }
    }

    if (activeTab === "posts") {
      fetchPosts()
    } else if (activeTab === "saved" && isCurrentUser) {
      fetchSavedPosts()
    } else if (activeTab === "media") {
      fetchPosts() // We'll filter for media in the component
    }
  }, [user.id, activeTab, isCurrentUser, currentUser?.uid])

  return (
    <Tabs defaultValue={activeTab} className="mt-6">
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="posts" asChild>
          <Link href={`/profile/${userId}?tab=posts`} className="flex-1">
            Posts
          </Link>
        </TabsTrigger>
        <TabsTrigger value="media" asChild>
          <Link href={`/profile/${userId}?tab=media`} className="flex-1">
            Media
          </Link>
        </TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        {isCurrentUser && (
          <TabsTrigger value="saved" asChild>
            <Link href={`/profile/${userId}?tab=saved`} className="flex-1">
              Saved
            </Link>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="posts" className="mt-6">
        {loading ? (
          <PostsSkeleton />
        ) : posts.length === 0 ? (
          <EmptyState
            message={`${isCurrentUser ? "You haven't" : `${user.displayName} hasn't`} posted anything yet.`}
          />
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="media" className="mt-6">
        <ProfileMedia posts={posts} loading={loading} />
      </TabsContent>

      <TabsContent value="analytics" className="mt-6">
        <ProfileAnalytics user={user} />
      </TabsContent>

      {isCurrentUser && (
        <TabsContent value="saved" className="mt-6">
          {loading ? (
            <PostsSkeleton />
          ) : savedPosts.length === 0 ? (
            <EmptyState message="You haven't saved any posts yet." />
          ) : (
            <div className="space-y-6">
              {savedPosts.map((post) => (
                <Post key={post.id} post={post} showSavedBadge />
              ))}
            </div>
          )}
        </TabsContent>
      )}
    </Tabs>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

function PostsSkeleton() {
  return (
    <div className="space-y-6">
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

