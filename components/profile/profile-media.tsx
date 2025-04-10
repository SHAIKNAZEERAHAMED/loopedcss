"use client"

import { useState } from "react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Post } from "@/components/post/post"

interface ProfileMediaProps {
  posts: any[]
  loading: boolean
}

export function ProfileMedia({ posts, loading }: ProfileMediaProps) {
  const [selectedPost, setSelectedPost] = useState<any>(null)

  // Filter posts by media type
  const imagePosts = posts.filter((post) => post.imageUrl)
  const videoPosts = posts.filter((post) => post.videoUrl)
  const audioPosts = posts.filter((post) => post.audioUrl)

  if (loading) {
    return <MediaSkeleton />
  }

  const hasNoMedia = imagePosts.length === 0 && videoPosts.length === 0 && audioPosts.length === 0

  if (hasNoMedia) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No media posts yet.</p>
      </div>
    )
  }

  return (
    <Tabs defaultValue="images" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="images">Images ({imagePosts.length})</TabsTrigger>
        <TabsTrigger value="videos">Videos ({videoPosts.length})</TabsTrigger>
        <TabsTrigger value="audio">Audio ({audioPosts.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="images" className="mt-6">
        {imagePosts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No image posts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {imagePosts.map((post) => (
              <Dialog key={post.id}>
                <DialogTrigger asChild>
                  <div
                    className="aspect-square rounded-md overflow-hidden cursor-pointer relative"
                    onClick={() => setSelectedPost(post)}
                  >
                    <Image
                      src={post.imageUrl || "/placeholder.svg"}
                      alt="Post image"
                      fill
                      className="object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">{selectedPost && <Post post={post} />}</DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="videos" className="mt-6">
        {videoPosts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No video posts yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {videoPosts.map((post) => (
              <Dialog key={post.id}>
                <DialogTrigger asChild>
                  <div
                    className="aspect-video rounded-md overflow-hidden cursor-pointer relative bg-muted flex items-center justify-center"
                    onClick={() => setSelectedPost(post)}
                  >
                    <video src={post.videoUrl} className="w-full h-full object-cover" />
                  </div>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">{selectedPost && <Post post={post} />}</DialogContent>
              </Dialog>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="audio" className="mt-6">
        {audioPosts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No audio posts yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {audioPosts.map((post) => (
              <div key={post.id} className="bg-card rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <path d="M12 2v20M6 12H2M22 12h-4M17 7H7M17 17H7"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium truncate">
                      {post.content.substring(0, 50)}
                      {post.content.length > 50 ? "..." : ""}
                    </div>
                    <audio src={post.audioUrl} controls className="w-full mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}

function MediaSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="aspect-square rounded-md" />
      ))}
    </div>
  )
}

