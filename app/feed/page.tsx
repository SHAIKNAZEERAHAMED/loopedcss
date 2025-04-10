"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/ui/icons"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sidebar } from "@/components/sidebar"
import { PostCard } from "@/components/post-card"
import { BobAI } from "@/components/bob-ai"

export default function Feed() {
  const { user, userProfile } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState("")
  const [showBobAI, setShowBobAI] = useState(false)

  useEffect(() => {
    // Fetch posts logic will go here
    setLoading(false)
  }, [])

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPost.trim()) return

    // Create post logic will go here
    setNewPost("")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container grid grid-cols-12 gap-6 px-4 py-6 md:gap-8 md:px-6">
        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-3">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="col-span-12 space-y-6 lg:col-span-6">
          {/* Create Post */}
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex space-x-4">
              <Avatar>
                <AvatarImage src={userProfile?.photoURL} alt={userProfile?.displayName} />
                <AvatarFallback>{userProfile?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <form className="flex-1" onSubmit={handleCreatePost}>
                <Input
                  placeholder="Share your CSS creation..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="mb-2"
                />
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setShowBobAI(true)}>
                    <Icons.bot className="mr-2 h-4 w-4" />
                    Ask Bob AI
                  </Button>
                  <Button type="submit">Post</Button>
                </div>
              </form>
            </div>
          </div>

          {/* Posts Feed */}
          {loading ? (
            <div className="flex justify-center p-8">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-4">
              {posts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-8 text-center">
              <h3 className="mb-2 text-lg font-semibold">Welcome to Loop(CSS)!</h3>
              <p className="text-muted-foreground">
                Start by sharing your first CSS creation or ask Bob AI for help.
              </p>
            </div>
          )}
        </main>

        {/* Right Sidebar - Trending/Suggestions */}
        <div className="col-span-12 space-y-4 lg:col-span-3">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold">Trending Designs</h3>
            {/* Trending content will go here */}
          </div>
        </div>
      </div>

      {/* Bob AI Assistant Dialog */}
      {showBobAI && (
        <BobAI onClose={() => setShowBobAI(false)} />
      )}
    </div>
  )
} 