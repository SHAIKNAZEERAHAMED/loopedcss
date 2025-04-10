"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp } from "lucide-react"
import { ref, get } from "firebase/database"
import { db } from "@/lib/firebase/config"
import Link from "next/link"
import type { Post } from "@/lib/post-service"

export function TrendingHashtags() {
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrendingTags() {
      try {
        // Get all posts
        const postsRef = ref(db, "posts")
        const snapshot = await get(postsRef)

        if (!snapshot.exists()) {
          setTrendingTags([])
          setLoading(false)
          return
        }

        // Extract hashtags from posts
        const allTags = new Map<string, number>()

        snapshot.forEach((childSnapshot) => {
          const post = childSnapshot.val() as Post

          if (post.content) {
            // Extract hashtags from content
            const hashtags = post.content.match(/#[\w\u0590-\u05ff]+/g) || []

            hashtags.forEach((tag) => {
              const count = allTags.get(tag) || 0
              allTags.set(tag, count + 1)
            })
          }
        })

        // Convert to array and sort by count
        const tagsArray = Array.from(allTags.entries()).map(([tag, count]) => ({ tag, count }))
        tagsArray.sort((a, b) => b.count - a.count)

        setTrendingTags(tagsArray.slice(0, 5))
      } catch (error) {
        console.error("Error fetching trending tags:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingTags()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Trending Hashtags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (trendingTags.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          <TrendingUp className="h-4 w-4" />
          Trending Hashtags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {trendingTags.map((tag) => (
            <Link key={tag.tag} href={`/explore?q=${encodeURIComponent(tag.tag)}`}>
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                {tag.tag}
                <span className="ml-1 text-xs text-muted-foreground">({tag.count})</span>
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

