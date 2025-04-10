import { Suspense } from "react"
import { MaxedLoopsFeed } from "@/components/maxed-loops/maxed-loops-feed"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Maxed Loops | SharePulse",
  description: "Watch short-form content from creators around the world",
}

export default function MaxedLoopsPage() {
  return (
    <div className="container max-w-md mx-auto py-4">
      <Tabs defaultValue="latest" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="latest">Latest</TabsTrigger>
          <TabsTrigger value="trending">Trending</TabsTrigger>
        </TabsList>

        <TabsContent value="latest" className="mt-0">
          <Suspense fallback={<MaxedLoopsSkeleton />}>
            <MaxedLoopsFeed feedType="latest" />
          </Suspense>
        </TabsContent>

        <TabsContent value="trending" className="mt-0">
          <Suspense fallback={<MaxedLoopsSkeleton />}>
            <MaxedLoopsFeed feedType="trending" />
          </Suspense>
        </TabsContent>
      </Tabs>
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

