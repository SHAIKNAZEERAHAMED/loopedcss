"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase/config"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { Post } from "@/components/post/post"
import { useAuth } from "@/contexts/auth-context"

export function ProfileSavedPosts() {
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // In a real app, you would query saved posts collection
        // This is a simplified version
        const savedPostsQuery = query(
          collection(db, "savedPosts"),
          where("userId", "==", user.uid),
          orderBy("savedAt", "desc"),
          limit(10),
        )

        const savedPostsSnapshot = await getDocs(savedPostsQuery)

        // Get the actual posts
        const postIds = savedPostsSnapshot.docs.map((doc) => doc.data().postId)

        if (postIds.length === 0) {
          setSavedPosts([])
          setLoading(false)
          return
        }

        // Fetch the actual posts
        // In a real app, you would use a batched get or where('id', 'in', postIds)
        // This is a simplified version
        const postsData = [
          {
            id: "saved-post-1",
            content: "This is a saved post that you bookmarked earlier.",
            author: {
              uid: "other-user",
              displayName: "Jane Doe",
              username: "janedoe",
              photoURL: "/placeholder.svg?height=40&width=40",
            },
            createdAt: new Date().toISOString(),
            likes: 128,
            comments: 32,
            shares: 12,
          },
          {
            id: "saved-post-2",
            content: "Another saved post that you found interesting.",
            author: {
              uid: "another-user",
              displayName: "John Smith",
              username: "johnsmith",
              photoURL: "/placeholder.svg?height=40&width=40",
            },
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            likes: 76,
            comments: 14,
            shares: 5,
          },
        ]

        setSavedPosts(postsData)
      } catch (error) {
        console.error("Error fetching saved posts:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSavedPosts()
  }, [user])

  if (loading) {
    return <div className="flex justify-center p-8">Loading saved posts...</div>
  }

  if (!user) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">Please sign in to view saved posts</p>
      </div>
    )
  }

  if (savedPosts.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No saved posts yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {savedPosts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  )
}

