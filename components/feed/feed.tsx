"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { moderateContent } from "@/lib/moderation-service"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { hasActiveSubscription, SUBSCRIPTION_TIERS } from "@/lib/subscription-service"
import { BobAssistant } from "@/components/bob/bob-assistant"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createLoopPost, getLoopPosts, LoopPost } from "@/lib/loop-service"
import { db } from "@/lib/firebase/config"
import { ref, get, set } from "firebase/database"

export function Feed() {
  const { user } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<LoopPost[]>([])
  const [newPost, setNewPost] = useState("")
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contentWarning, setContentWarning] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [isBobOpen, setIsBobOpen] = useState(false)

  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        const hasPremium = await hasActiveSubscription(user.uid, SUBSCRIPTION_TIERS.PREMIUM)
        setIsPremium(hasPremium)
      }
    }
    checkSubscription()
    loadPosts()
  }, [user])

  const loadPosts = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedPosts = await getLoopPosts("general") // Default loop
      setPosts(fetchedPosts)
    } catch (err) {
      setError("Failed to load posts. Please try again later.")
      console.error("Error loading posts:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newPost.trim()) return

    try {
      setPosting(true)
      setContentWarning(null)

      // Check content moderation
      const moderationResult = await moderateContent(newPost)
      if (!moderationResult.isSafe) {
        setContentWarning(moderationResult.warning || "Content may be inappropriate")
        return
      }

      // Create post
      await createLoopPost(
        "general",
        newPost,
        user.uid,
        user.displayName || "Anonymous",
        user.photoURL || undefined
      )

      // Clear form and reload posts
      setNewPost("")
      await loadPosts()
    } catch (err) {
      setError("Failed to create post. Please try again.")
      console.error("Error creating post:", err)
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId: string) => {
    if (!user) return
    try {
      const postRef = ref(db, `posts/${postId}/likes/${user.uid}`)
      const snapshot = await get(postRef)
      
      if (snapshot.exists()) {
        await set(postRef, null)
      } else {
        await set(postRef, true)
      }
      
      await loadPosts()
    } catch (error) {
      console.error("Error liking post:", error)
      setError("Failed to like post. Please try again.")
    }
  }

  const handleSave = async (postId: string) => {
    if (!user) return
    try {
      const savedRef = ref(db, `savedPosts/${user.uid}/${postId}`)
      const snapshot = await get(savedRef)
      
      if (snapshot.exists()) {
        await set(savedRef, null)
      } else {
        await set(savedRef, true)
      }
      
      await loadPosts()
    } catch (error) {
      console.error("Error saving post:", error)
      setError("Failed to save post. Please try again.")
    }
  }

  const handleComment = async (postId: string) => {
    router.push(`/post/${postId}`)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border border-muted/30">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Share your thoughts</h2>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20"
              onClick={() => setIsBobOpen(true)}
            >
              <Icons.bot className="h-4 w-4 text-blue-500" />
              Ask BOB
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's happening?"
                  className={cn(
                    "min-h-[100px] resize-none text-base",
                    contentWarning && "border-destructive"
                  )}
                />
                {contentWarning && (
                  <Alert variant="destructive" className="mt-2">
                    <Icons.warning className="h-4 w-4" />
                    <AlertDescription>{contentWarning}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                  <Icons.image className="h-5 w-5" />
                </Button>
                <Button type="button" variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50">
                  <Icons.video className="h-5 w-5" />
                </Button>
              </div>
              <Button 
                type="submit" 
                disabled={posting || !newPost.trim()} 
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6"
              >
                {posting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Share
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-3 gap-4 bg-muted/50 p-1">
              <TabsTrigger value="all" className="rounded-md">For You</TabsTrigger>
              <TabsTrigger value="following" className="rounded-md">Following</TabsTrigger>
              <TabsTrigger value="trending" className="rounded-md">Trending</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No posts yet. Be the first to share something!</p>
                    </div>
                  ) : (
                    posts.map((post) => (
                      <Card key={post.id} className="border border-muted/30">
                        <CardHeader className="pb-3">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={post.authorPhotoURL} />
                              <AvatarFallback>{post.authorName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium leading-none">{post.authorName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(post.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                {isPremium && (
                                  <Badge variant="outline" className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                                    Premium
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <p className="text-base">{post.content}</p>
                        </CardContent>
                        <CardFooter className="pt-3 border-t">
                          <div className="flex items-center justify-between w-full">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => handleLike(post.id)}
                            >
                              {post.likes?.[user?.uid] ? (
                                <Icons.heartFilled className="h-5 w-5 text-red-500 mr-1" />
                              ) : (
                                <Icons.heart className="h-5 w-5 mr-1" />
                              )}
                              {Object.keys(post.likes || {}).length}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => handleComment(post.id)}
                            >
                              <Icons.message className="h-5 w-5 mr-1" />
                              {Object.keys(post.comments || {}).length}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-primary"
                              onClick={() => handleSave(post.id)}
                            >
                              {post.saved?.[user?.uid] ? (
                                <Icons.bookmarkFilled className="h-5 w-5 text-primary mr-1" />
                              ) : (
                                <Icons.bookmark className="h-5 w-5 mr-1" />
                              )}
                              Save
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="following" className="mt-4">
              {/* Similar structure for following posts */}
            </TabsContent>

            <TabsContent value="trending" className="mt-4">
              {/* Similar structure for trending posts */}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {!isPremium && (
        <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Upgrade to Premium</h3>
                <p className="text-sm opacity-90">
                  Unlock AI features, exclusive content, and premium loops!
                </p>
              </div>
              <Button variant="secondary" size="lg" className="bg-white text-purple-500 hover:bg-white/90" asChild>
                <Link href="/subscription">
                  <Icons.sparkles className="mr-2 h-5 w-5" />
                  Upgrade Now
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isBobOpen} onOpenChange={setIsBobOpen}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <BobAssistant />
        </DialogContent>
      </Dialog>

      <Button
        size="lg"
        className="fixed bottom-6 right-6 rounded-full shadow-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
        onClick={() => setIsBobOpen(true)}
      >
        <Icons.bot className="h-6 w-6 mr-2" />
        Ask BOB AI
      </Button>
    </div>
  )
}

