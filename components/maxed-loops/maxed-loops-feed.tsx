"use client"

import { useState, useEffect, useRef } from "react"
import { useInView } from "react-intersection-observer"
import {
  type MaxedLoop,
  getMaxedLoopsFeed,
  getTrendingMaxedLoops,
  getMaxedLoopsByHashtag,
} from "@/lib/maxed-loops-service"
import { MaxedLoopCard } from "./maxed-loop-card"
import { MaxedLoopComments } from "./maxed-loop-comments"
import { Loader2 } from "lucide-react"

interface MaxedLoopsFeedProps {
  initialMaxedLoops?: MaxedLoop[]
  feedType?: "latest" | "trending" | "hashtag"
  hashtag?: string
}

export function MaxedLoopsFeed({ initialMaxedLoops = [], feedType = "latest", hashtag = "" }: MaxedLoopsFeedProps) {
  const [maxedLoops, setMaxedLoops] = useState<MaxedLoop[]>(initialMaxedLoops)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [activeMaxedLoopId, setActiveMaxedLoopId] = useState<string | null>(null)
  const [showComments, setShowComments] = useState(false)

  // Use intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView()

  // Track the last maxed loop ID for pagination
  const lastMaxedLoopIdRef = useRef<string | undefined>(
    maxedLoops.length > 0 ? maxedLoops[maxedLoops.length - 1].id : undefined,
  )

  // Load initial maxed loops if not provided
  useEffect(() => {
    if (initialMaxedLoops.length === 0) {
      loadMaxedLoops()
    }
  }, [initialMaxedLoops])

  // Load more maxed loops when the load more element comes into view
  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMaxedLoops()
    }
  }, [inView, hasMore, loading])

  // Load maxed loops based on feed type
  const loadMaxedLoops = async () => {
    if (loading || !hasMore) return

    setLoading(true)

    try {
      let newMaxedLoops: MaxedLoop[] = []

      switch (feedType) {
        case "trending":
          newMaxedLoops = await getTrendingMaxedLoops(10)
          break
        case "hashtag":
          if (hashtag) {
            newMaxedLoops = await getMaxedLoopsByHashtag(hashtag, 10, lastMaxedLoopIdRef.current)
          }
          break
        case "latest":
        default:
          newMaxedLoops = await getMaxedLoopsFeed(10, lastMaxedLoopIdRef.current)
          break
      }

      if (newMaxedLoops.length === 0) {
        setHasMore(false)
      } else {
        setMaxedLoops((prev) => {
          // Filter out duplicates
          const existingIds = new Set(prev.map((loop) => loop.id))
          const filteredNewLoops = newMaxedLoops.filter((loop) => !existingIds.has(loop.id))

          // Update the last maxed loop ID for pagination
          if (filteredNewLoops.length > 0) {
            lastMaxedLoopIdRef.current = filteredNewLoops[filteredNewLoops.length - 1].id
          }

          return [...prev, ...filteredNewLoops]
        })
      }
    } catch (error) {
      console.error("Error loading maxed loops:", error)
    } finally {
      setLoading(false)
    }
  }

  // Handle comment click
  const handleCommentClick = (maxedLoopId: string) => {
    setActiveMaxedLoopId(maxedLoopId)
    setShowComments(true)
  }

  // Close comments
  const handleCloseComments = () => {
    setShowComments(false)
    setActiveMaxedLoopId(null)
  }

  return (
    <div className="relative">
      {/* Maxed Loops Feed */}
      <div className="space-y-1">
        {maxedLoops.map((maxedLoop) => (
          <MaxedLoopCard key={maxedLoop.id} maxedLoop={maxedLoop} onCommentClick={handleCommentClick} autoPlay={true} />
        ))}

        {/* Load more trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center items-center p-4">
            {loading && <Loader2 className="w-6 h-6 animate-spin" />}
          </div>
        )}

        {/* Empty state */}
        {maxedLoops.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">No Maxed Loops Found</h3>
            <p className="text-muted-foreground">
              {feedType === "hashtag"
                ? `No Maxed Loops found with hashtag #${hashtag}`
                : "Be the first to create a Maxed Loop!"}
            </p>
          </div>
        )}
      </div>

      {/* Comments Drawer */}
      {showComments && activeMaxedLoopId && (
        <MaxedLoopComments maxedLoopId={activeMaxedLoopId} onClose={handleCloseComments} />
      )}
    </div>
  )
}

