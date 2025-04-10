"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"
import {
  type Loop,
  type LoopPost,
  subscribeToLoop,
  subscribeToLoopPosts,
  joinLoop,
  leaveLoop,
} from "@/lib/loop-service"
import {
  Loader2,
  Users,
  ArrowLeft,
  Settings,
  Bell,
  UserPlus,
  UserMinus,
  MessageSquare,
  Calendar,
  Info,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { CreateLoopPostForm } from "@/components/loops/create-loop-post-form"
import { LoopPost as LoopPostComponent } from "@/components/loops/loop-post"

export default function LoopDetailPage() {
  const { id } = useParams() as { id: string }
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loop, setLoop] = useState<Loop | null>(null)
  const [posts, setPosts] = useState<LoopPost[]>([])
  const [isJoined, setIsJoined] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (!id) return

    // Subscribe to loop data
    const unsubscribeLoop = subscribeToLoop(id, (loopData) => {
      setLoop(loopData)
      setPageLoading(false)
    })

    // Subscribe to loop posts
    const unsubscribePosts = subscribeToLoopPosts(id, (postsData) => {
      setPosts(postsData)
    })

    return () => {
      unsubscribeLoop()
      unsubscribePosts()
    }
  }, [id, user, loading, router])

  // Check if user is a member of this loop
  useEffect(() => {
    if (!user || !loop) return

    const checkMembership = async () => {
      try {
        // In a real app, you'd query the database
        // For now, we'll simulate with a timeout
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Check if user is a member
        const isMember = Math.random() > 0.5 // Simulate random membership
        setIsJoined(isMember)

        // Set user role
        if (isMember) {
          if (loop.creatorId === user.uid) {
            setUserRole("admin")
          } else {
            setUserRole(Math.random() > 0.8 ? "moderator" : "member")
          }
        } else {
          setUserRole(null)
        }
      } catch (error) {
        console.error("Error checking membership:", error)
      }
    }

    checkMembership()
  }, [user, loop])

  const handleJoinLoop = async () => {
    if (!user || !loop) return

    setIsJoining(true)

    try {
      await joinLoop(loop.id, user.uid, user.displayName || "Unknown User", user.photoURL || undefined)

      setIsJoined(true)
      setUserRole("member")

      toast({
        title: "Joined Loop",
        description: `You are now a member of ${loop.name}.`,
      })
    } catch (error) {
      console.error("Error joining loop:", error)
      toast({
        title: "Error",
        description: "Failed to join loop. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveLoop = async () => {
    if (!user || !loop || userRole === "admin") return

    setIsJoining(true)

    try {
      await leaveLoop(loop.id, user.uid)

      setIsJoined(false)
      setUserRole(null)

      toast({
        title: "Left Loop",
        description: `You are no longer a member of ${loop.name}.`,
      })
    } catch (error) {
      console.error("Error leaving loop:", error)
      toast({
        title: "Error",
        description: "Failed to leave loop. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handlePostCreated = (post: LoopPost) => {
    // The post will be added automatically via the subscription
    toast({
      title: "Post Created",
      description: "Your post has been published to the loop.",
    })
  }

  if (pageLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Loading loop...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!loop) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <h1 className="text-2xl font-bold mb-4">Loop Not Found</h1>
            <p className="text-muted-foreground mb-6">The loop you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push("/loops")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Loops
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => router.push("/loops")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Loops
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: loop.color }}
              >
                <Users className="h-8 w-8" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{loop.name}</h1>
                  {userRole === "admin" && (
                    <Badge variant="outline" className="ml-2">
                      Admin
                    </Badge>
                  )}
                  {userRole === "moderator" && (
                    <Badge variant="outline" className="ml-2">
                      Moderator
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="rounded-sm">
                    {loop.category}
                  </Badge>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{loop.genre}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    Created {formatDistanceToNow(new Date(loop.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 self-end md:self-auto">
              {isJoined ? (
                <>
                  {userRole !== "admin" && (
                    <Button variant="outline" onClick={handleLeaveLoop} disabled={isJoining}>
                      {isJoining ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4 mr-2" />
                      )}
                      Leave
                    </Button>
                  )}

                  <Button variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </Button>

                  {userRole === "admin" && (
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  )}
                </>
              ) : (
                <Button className="connect-bg hover:bg-opacity-90" onClick={handleJoinLoop} disabled={isJoining}>
                  {isJoining ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Join Loop
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <p>{loop.description}</p>

            <div className="flex flex-wrap gap-6 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{loop.memberCount.toLocaleString()} members</span>
              </div>

              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{loop.postCount} posts</span>
              </div>

              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Created {new Date(loop.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className="mb-6">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {isJoined ? (
              <div className="space-y-6">
                <CreateLoopPostForm loopId={loop.id} onPostCreated={handlePostCreated} />

                {posts.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-medium mb-2">No posts yet</h3>
                      <p className="text-muted-foreground mb-6">Be the first to post in this loop!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <LoopPostComponent key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <Info className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Join to see posts</h3>
                  <p className="text-muted-foreground mb-6">
                    You need to join this loop to see posts and participate in discussions.
                  </p>
                  <Button className="connect-bg hover:bg-opacity-90" onClick={handleJoinLoop} disabled={isJoining}>
                    {isJoining ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Join Loop
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="about">
            <Card>
              <CardHeader>
                <CardTitle>About this Loop</CardTitle>
                <CardDescription>Learn more about this community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p>{loop.description}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Rules</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {loop.rules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Creator</h3>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{loop.creatorName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{loop.creatorName}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(loop.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
                <CardDescription>{loop.memberCount.toLocaleString()} people in this loop</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Member list coming soon</h3>
                  <p className="text-muted-foreground">We're working on this feature. Check back later!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

