"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  MapPin,
  Globe,
  Calendar,
  Grid,
  Bookmark,
  Heart,
  Settings,
  UserPlus,
  UserMinus,
  MessageSquare,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import {
  getUser,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  type User as UserType,
} from "@/lib/user-service"
import { getUserPosts, type Post as PostType } from "@/lib/post-service"
import { Post } from "@/components/posts/post"
import { SafetyIndicator } from "@/components/safety/safety-indicator"
import { calculateSafetyScore } from "@/lib/ai-moderation"

// This is required for static export with dynamic routes
export function generateStaticParams() {
  // Return an empty array since we'll handle all profiles client-side
  return []
}

export default function ProfilePage() {
  const { userId } = useParams() as { userId: string }
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [profileUser, setProfileUser] = useState<UserType | null>(null)
  const [posts, setPosts] = useState<PostType[]>([])
  const [followers, setFollowers] = useState<UserType[]>([])
  const [following, setFollowing] = useState<UserType[]>([])
  const [isUserFollowing, setIsUserFollowing] = useState(false)
  const [safetyScore, setSafetyScore] = useState({ score: 100, level: "green" as "green" | "yellow" | "red" })
  const [pageLoading, setPageLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)

  const isOwnProfile = user?.uid === userId

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    const fetchProfileData = async () => {
      try {
        // Fetch user data
        const userData = await getUser(userId)
        if (userData) {
          setProfileUser(userData)

          // Fetch posts
          const userPosts = await getUserPosts(userId)
          setPosts(userPosts)

          // Fetch followers and following
          const userFollowers = await getFollowers(userId)
          const userFollowing = await getFollowing(userId)
          setFollowers(userFollowers)
          setFollowing(userFollowing)

          // Check if current user is following this profile
          if (user && user.uid !== userId) {
            const following = await isFollowing(user.uid, userId)
            setIsUserFollowing(following)
          }

          // Calculate safety score
          const contentHistory = userPosts.map((post) => ({
            content: post.content || "",
            moderationResult: {
              isSafe: post.isSafe ?? true,
              category: post.safetyCategory,
              confidence: post.safetyConfidence || 0.5,
            },
          }))

          const safety = await calculateSafetyScore(contentHistory)
          setSafetyScore({
            score: Math.round(safety.score),
            level: safety.level,
          })
        } else {
          toast({
            title: "User not found",
            description: "The requested profile could not be found.",
            variant: "destructive",
          })
          router.push("/feed")
        }
      } catch (error) {
        console.error("Error fetching profile data:", error)
        toast({
          title: "Error",
          description: "Failed to load profile data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setPageLoading(false)
      }
    }

    if (userId) {
      fetchProfileData()
    }
  }, [userId, user, loading, router, toast])

  const handleFollow = async () => {
    if (!user || followLoading) return

    setFollowLoading(true)

    try {
      if (isUserFollowing) {
        await unfollowUser(user.uid, userId)
        setIsUserFollowing(false)
        setFollowers((prev) => prev.filter((f) => f.uid !== user.uid))

        toast({
          title: "Unfollowed",
          description: `You are no longer following ${profileUser?.displayName}.`,
        })
      } else {
        await followUser(user.uid, userId)
        setIsUserFollowing(true)

        // Add current user to followers list if not already there
        if (!followers.some((f) => f.uid === user.uid)) {
          const currentUser = await getUser(user.uid)
          if (currentUser) {
            setFollowers((prev) => [...prev, currentUser])
          }
        }

        toast({
          title: "Following",
          description: `You are now following ${profileUser?.displayName}.`,
        })
      }
    } catch (error) {
      console.error("Error following/unfollowing user:", error)
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      })
    } finally {
      setFollowLoading(false)
    }
  }

  const handleMessage = () => {
    // Navigate to chat with this user
    router.push(`/chat?userId=${userId}`)
  }

  if (pageLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!profileUser) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6 px-4">
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <h2 className="text-2xl font-bold mb-2">User not found</h2>
            <p className="text-muted-foreground mb-6">The requested profile could not be found.</p>
            <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const userInitials = profileUser.displayName
    ? profileUser.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const joinedDate = profileUser.createdAt
    ? formatDistanceToNow(new Date(profileUser.createdAt), { addSuffix: true })
    : "Unknown"

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Cover Photo */}
        <div className="relative w-full h-48 md:h-64 rounded-lg overflow-hidden bg-muted mb-16">
          {profileUser.coverPhotoURL ? (
            <Image
              src={profileUser.coverPhotoURL || "/placeholder.svg"}
              alt={`${profileUser.displayName}'s cover`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20" />
          )}

          {/* Profile Picture */}
          <div className="absolute -bottom-12 left-6 border-4 border-background rounded-full">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profileUser.photoURL || ""} />
              <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
            </Avatar>
          </div>

          {/* Action Buttons */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            {isOwnProfile ? (
              <Button
                variant="outline"
                className="bg-background/80 backdrop-blur-sm hover:bg-background"
                onClick={() => router.push("/settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  variant={isUserFollowing ? "outline" : "default"}
                  className={isUserFollowing ? "bg-background/80 backdrop-blur-sm hover:bg-background" : ""}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : isUserFollowing ? (
                    <UserMinus className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {isUserFollowing ? "Unfollow" : "Follow"}
                </Button>

                <Button
                  variant="outline"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={handleMessage}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="mb-8 pl-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{profileUser.displayName}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                {profileUser.status === "online" && (
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    Online
                  </Badge>
                )}
                <SafetyIndicator level={safetyScore.level} score={safetyScore.score} />
              </div>
            </div>

            <div className="flex gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">{profileUser.postsCount || 0}</p>
                <p className="text-sm text-muted-foreground">Posts</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{profileUser.followersCount || 0}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{profileUser.followingCount || 0}</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </div>
            </div>
          </div>

          {profileUser.bio && <p className="mt-4 max-w-2xl">{profileUser.bio}</p>}

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
            {profileUser.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{profileUser.location}</span>
              </div>
            )}

            {profileUser.website && (
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                <a
                  href={profileUser.website.startsWith("http") ? profileUser.website : `https://${profileUser.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {profileUser.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Joined {joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts">
          <TabsList className="mb-6">
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Grid className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="likes" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Likes
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Grid className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">No posts yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    {isOwnProfile
                      ? "You haven't posted anything yet. Share your first post!"
                      : `${profileUser.displayName} hasn't posted anything yet.`}
                  </p>
                  {isOwnProfile && (
                    <Button className="mt-6" onClick={() => router.push("/dashboard")}>
                      Create Post
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {posts.map((post) => (
                  <Post key={post.id} post={post} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="likes">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Liked posts</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {isOwnProfile
                    ? "Posts you've liked will appear here."
                    : `Posts ${profileUser.displayName} has liked will appear here.`}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Saved posts</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {isOwnProfile
                    ? "Posts you've saved will appear here."
                    : `Posts ${profileUser.displayName} has saved will appear here.`}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

