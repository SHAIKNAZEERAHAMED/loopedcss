"use client"

import { StoriesContainer } from "@/components/stories/stories-container"
import { CreatePostForm } from "@/components/posts/create-post-form"
import { PostFeed } from "@/components/posts/post-feed"
import { TrendingHashtags } from "@/components/trending/trending-hashtags"
import { SuggestedUsers } from "@/components/users/suggested-users"
import { CreatePoll } from "@/components/polls/create-poll"
import { PollCard } from "@/components/polls/poll-card"

export function HomeContent() {
  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <StoriesContainer />
          <CreatePostForm />
          <PostFeed />
        </div>

        <div className="space-y-6">
          <TrendingHashtags />
          <SuggestedUsers />
          <CreatePoll />
          {/* Featured poll - we'd fetch the most popular active poll here */}
          <PollCard pollId="-featured" />
        </div>
      </div>
    </div>
  )
} 