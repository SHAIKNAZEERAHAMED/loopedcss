"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getSavedPostsCount } from "@/lib/saved-posts-service"
import { Bookmark } from "lucide-react"

export function SavedPostsHeader() {
  const { user } = useAuth()
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    async function fetchSavedCount() {
      if (!user?.uid) return

      try {
        const count = await getSavedPostsCount(user.uid)
        setSavedCount(count)
      } catch (error) {
        console.error("Error fetching saved count:", error)
      }
    }

    fetchSavedCount()
  }, [user?.uid])

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <Bookmark className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Saved Posts</h1>
      </div>
      <div className="text-sm text-muted-foreground">
        {savedCount} {savedCount === 1 ? "post" : "posts"} saved
      </div>
    </div>
  )
}

