import { Suspense } from "react"
import { SavedPostsFeed } from "@/components/saved/saved-posts-feed"
import { Skeleton } from "@/components/ui/skeleton"
import { SavedPostsHeader } from "@/components/saved/saved-posts-header"

export const metadata = {
  title: "Saved Posts | SharePulse",
  description: "View your saved posts",
}

export default function SavedPostsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <SavedPostsHeader />

      <Suspense fallback={<SavedPostsSkeleton />}>
        <SavedPostsFeed />
      </Suspense>
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

