"use client"

import { Bookmark, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function SavedPostsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted rounded-full p-4 mb-4">
        <Bookmark className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No saved posts yet</h3>
      <p className="text-muted-foreground max-w-md mb-6">
        When you save posts, they'll appear here so you can easily find them later.
      </p>
      <Button asChild>
        <Link href="/">
          <PlusCircle className="mr-2 h-4 w-4" />
          Explore posts to save
        </Link>
      </Button>
    </div>
  )
}

