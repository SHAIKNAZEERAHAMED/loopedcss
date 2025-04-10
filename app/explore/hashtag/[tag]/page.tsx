import { Suspense } from "react"
import { MaxedLoopsFeed } from "@/components/maxed-loops/maxed-loops-feed"
import { Skeleton } from "@/components/ui/skeleton"
import type { Metadata } from "next"

interface HashtagPageProps {
  params: {
    tag: string
  }
}

export function generateMetadata({ params }: HashtagPageProps): Metadata {
  const decodedTag = decodeURIComponent(params.tag)

  return {
    title: `#${decodedTag} | SharePulse`,
    description: `Explore Maxed Loops with the hashtag #${decodedTag}`,
  }
}

export default function HashtagPage({ params }: HashtagPageProps) {
  const decodedTag = decodeURIComponent(params.tag)

  return (
    <div className="container max-w-md mx-auto py-4">
      <h1 className="text-2xl font-bold mb-4">#{decodedTag}</h1>

      <Suspense fallback={<MaxedLoopsSkeleton />}>
        <MaxedLoopsFeed feedType="hashtag" hashtag={decodedTag} />
      </Suspense>
    </div>
  )
}

function MaxedLoopsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="relative w-full h-[calc(100vh-200px)] max-h-[600px] rounded-lg overflow-hidden">
          <Skeleton className="absolute inset-0" />
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

