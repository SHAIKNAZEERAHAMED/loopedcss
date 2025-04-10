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
import { db } from "@/lib/firebase/config"
import { ref, get, set, remove } from "firebase/database"
import { Post } from "@/components/posts/post"
import { CreatePostForm } from "@/components/posts/create-post-form"
import { AlgorithmExplainer } from "@/components/feed/algorithm-explainer"
import { Loader2 } from "lucide-react"
import { type Post as PostType, subscribeToFeed, getUserFollowingPosts, getTrendingPosts, createPost } from "@/lib/post-service"
import { SafetyDashboard } from "@/components/safety/safety-dashboard"

export function Feed() {
  const { user } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<PostType[]>([])
  const [followingPosts, setFollowingPosts] = useState<PostType[]>([])
  const [trendingPosts, setTrendingPosts] = useState<PostType[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contentWarning, setContentWarning] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [isBobOpen, setIsBobOpen] = useState(false)
  const [newPost, setNewPost] = useState("")
  const [showSafetyDashboard, setShowSafetyDashboard] = useState(false)

  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        const hasPremium = await hasActiveSubscription(user.uid, SUBSCRIPTION_TIERS.PREMIUM)
        setIsPremium(hasPremium)
      }
    }
    checkSubscription()
  }, [user])

  useEffect(() => {
    if (!user) return

    // Subscribe to all posts in real-time
    const unsubscribeAll = subscribeToFeed((newPosts) => {
      setPosts(newPosts)
      setLoading(false)
    }, 20)

    // Load following posts
    const loadFollowingPosts = async () => {
      try {
        const following = await getUserFollowingPosts(user.uid)
        setFollowingPosts(following)
      } catch (err) {
        console.error("Error loading following posts:", err)
      }
    }

    // Load trending posts
    const loadTrendingPosts = async () => {
      try {
        const trending = await getTrendingPosts()
        setTrendingPosts(trending)
      } catch (err) {
        console.error("Error loading trending posts:", err)
      }
    }

    loadFollowingPosts()
    loadTrendingPosts()

    // Set up intervals to refresh following and trending posts
    const followingInterval = setInterval(loadFollowingPosts, 60000) // Refresh every minute
    const trendingInterval = setInterval(loadTrendingPosts, 300000) // Refresh every 5 minutes

    return () => {
      unsubscribeAll()
      clearInterval(followingInterval)
      clearInterval(trendingInterval)
    }
  }, [user])

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
      await createPost(
        user.uid,
        user.displayName || "Anonymous",
        user.photoURL || undefined,
        newPost
      )

      // Clear form
      setNewPost("")
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
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Share your thoughts</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setShowSafetyDashboard(prev => !prev)}
              >
                <Icons.shield className="h-4 w-4 text-blue-500" />
                Safety
              </Button>
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

      {showSafetyDashboard && (
        <SafetyDashboard />
      )}

      <Card>
        <CardHeader className="pb-3 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Your Feed</h2>
          <AlgorithmExplainer />
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="all" className="w-full">
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
                      <Post 
                        key={post.id} 
                        post={post} 
                        onLike={() => handleLike(post.id)}
                        onComment={() => handleComment(post.id)}
                        onSave={() => handleSave(post.id)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="following" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {followingPosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Follow some users to see their posts here!</p>
                    </div>
                  ) : (
                    followingPosts.map((post) => (
                      <Post 
                        key={post.id} 
                        post={post}
                        onLike={() => handleLike(post.id)}
                        onComment={() => handleComment(post.id)}
                        onSave={() => handleSave(post.id)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="trending" className="mt-4">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {trendingPosts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No trending posts yet.</p>
                    </div>
                  ) : (
                    trendingPosts.map((post) => (
                      <Post 
                        key={post.id} 
                        post={post}
                        onLike={() => handleLike(post.id)}
                        onComment={() => handleComment(post.id)}
                        onSave={() => handleSave(post.id)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
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

