import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getMaxedLoop } from "@/lib/maxed-loops-service"
import { MaxedLoopCard } from "@/components/maxed-loops/maxed-loop-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { Metadata } from "next"

interface MaxedLoopPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: MaxedLoopPageProps): Promise<Metadata> {
  const maxedLoop = await getMaxedLoop(params.id)

  if (!maxedLoop) {
    return {
      title: "Maxed Loop Not Found | SharePulse",
      description: "The requested Maxed Loop could not be found",
    }
  }

  return {
    title: `${maxedLoop.username}'s Maxed Loop | SharePulse`,
    description: maxedLoop.caption || "Watch this Maxed Loop on SharePulse",
    openGraph: {
      images: [maxedLoop.thumbnailUrl],
    },
  }
}

export default async function MaxedLoopPage({ params }: MaxedLoopPageProps) {
  const maxedLoop = await getMaxedLoop(params.id)

  if (!maxedLoop || !maxedLoop.isApproved) {
    notFound()
  }

  return (
    <div className="container max-w-md mx-auto py-4">
      <Suspense fallback={<MaxedLoopSkeleton />}>
        <MaxedLoopCard maxedLoop={maxedLoop} autoPlay={true} />
      </Suspense>
    </div>
  )
}

function MaxedLoopSkeleton() {
  return (
    <div className="relative w-full h-[calc(100vh-120px)] max-h-[800px] rounded-lg overflow-hidden">
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
  )
}

