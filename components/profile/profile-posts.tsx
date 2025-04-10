"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase/config"
import { ref, query, orderByChild, equalTo, limitToLast, get } from "firebase/database"
import { Post } from "@/components/post/post"
import { useAuth } from "@/contexts/auth-context"

interface ProfilePostsProps {
  userId: string
}

export function ProfilePosts({ userId }: ProfilePostsProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { userProfile } = useAuth()

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Query posts by author ID
        const postsRef = ref(db, "posts")
        const postsQuery = query(
          postsRef,
          orderByChild("authorId"),
          equalTo(userId),
          limitToLast(10)
        )

        const snapshot = await get(postsQuery)
        const fetchedPosts: any[] = []
        
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            fetchedPosts.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            })
          })
        }
        
        // Sort by createdAt in descending order (newest first)
        fetchedPosts.sort((a, b) => {
          const timeA = a.createdAt || 0
          const timeB = b.createdAt || 0
          return timeB - timeA
        })
        
        setPosts(fetchedPosts)
      } catch (error) {
        console.error("Error fetching posts:", error)
        // Fallback to demo data
        setPosts([
          {
            id: "demo-post-1",
            content: "This is a demo post for the profile page.",
            authorId: userId,
            authorName: userId,
            authorPhotoURL: "/placeholder.svg?height=40&width=40",
            createdAt: new Date().toISOString(),
            likesCount: 42,
            commentsCount: 7,
          },
          {
            id: "demo-post-2",
            content: "Another demo post showing what the profile posts look like.",
            authorId: userId,
            authorName: userId,
            authorPhotoURL: "/placeholder.svg?height=40&width=40",
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            likesCount: 24,
            commentsCount: 3,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [userId])

  if (loading) {
    return <div className="flex justify-center p-8">Loading posts...</div>
  }

  if (posts.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No posts yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
    </div>
  )
}

