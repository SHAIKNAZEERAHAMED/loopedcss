import { Metadata } from "next"
import { Feed } from "@/components/feed/feed"

export const metadata: Metadata = {
  title: "Feed | Loop(CSS)",
  description: "See what's happening in your network",
}

export default function FeedPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4">
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Your Feed</h1>
          <p className="text-muted-foreground">
            See what's happening in your network
          </p>
        </div>
        <Feed />
      </div>
    </div>
  )
}

