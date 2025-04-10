"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Grid,
  Bookmark,
  Heart,
  Settings,
  Edit,
  Users,
  MessageSquare,
  Tag,
  Share2,
  MapPin,
  LinkIcon,
  Calendar,
} from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  subscribeToUser,
  type User,
} from "@/lib/user-service"
import { type Post as PostType, subscribeToUserPosts, getUserLikedPosts } from "@/lib/post-service"
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog"
import { FollowersDialog } from "@/components/profile/followers-dialog"
import { FollowingDialog } from "@/components/profile/following-dialog"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/components/ui/use-toast"

interface InstagramProfileProps {
  userId: string
}

export function InstagramProfile({ userId }: InstagramProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<PostType[]>([])
  const [likedPosts, setLikedPosts] = useState<PostType[]>([])
  const [isFollowed, setIsFollowed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false)
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!userId) return

    // Subscribe to user profile in real-time
    const unsubscribeUser = subscribeToUser(userId, (userData) => {
      setUser(userData)
      setIsLoading(false)
    })

    // Subscribe to user posts in real-time
    const unsubscribePosts = subscribeToUserPosts(userId, (userPosts) => {
      setPosts(userPosts)
    })

    // Check if the current user is following this profile
    const checkFollowStatus = async () => {
      if (currentUser && userId !== currentUser.uid) {
        try {
          const followed = await isFollowing(currentUser.uid, userId)
          setIsFollowed(followed)
        } catch (error) {
          console.error("Error checking follow status:", error)
        }
      }
    }

    // Get followers and following
    const fetchFollowLists = async () => {
      try {
        const [followersList, followingList] = await Promise.all([getFollowers(userId), getFollowing(userId)])

        setFollowers(followersList)
        setFollowing(followingList)
      } catch (error) {
        console.error("Error fetching follow lists:", error)
      }
    }

    // Get liked posts
    const fetchLikedPosts = async () => {
      if (currentUser && userId === currentUser.uid) {
        try {
          const liked = await getUserLikedPosts(userId)
          setLikedPosts(liked)
        } catch (error) {
          console.error("Error fetching liked posts:", error)
        }
      }
    }

    checkFollowStatus()
    fetchFollowLists()
    fetchLikedPosts()

    return () => {
      unsubscribeUser()
      unsubscribePosts()
    }
  }, [userId, currentUser])

  const handleFollow = async () => {
    if (!currentUser || !user) return

    setFollowLoading(true)

    try {
      if (isFollowed) {
        await unfollowUser(currentUser.uid, userId)
        setIsFollowed(false)
        toast({
          title: `Unfollowed ${user.displayName}`,
          description: `You have unfollowed ${user.displayName}`,
        })
      } else {
        await followUser(currentUser.uid, userId)
        setIsFollowed(true)
        toast({
          title: `Following ${user.displayName}`,
          description: `You are now following ${user.displayName}`,
        })
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error)
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
    if (!user) return
    router.push(`/messages?user=${userId}`)
  }

  const handleShare = () => {
    if (!user) return

    // Create a shareable URL - use username if available, otherwise use uid
    const profileUrl = `${window.location.origin}/profile/${user.username || user.uid}`

    // Use Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: `${user.displayName}'s Profile`,
          text: `Check out ${user.displayName}'s profile on Loop(CSS)`,
          url: profileUrl,
        })
        .catch((err) => {
          console.error("Error sharing:", err)
          // Fallback to copying to clipboard
          copyToClipboard(profileUrl)
        })
    } else {
      // Fallback to copying to clipboard
      copyToClipboard(profileUrl)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Link copied!",
          description: "Profile link copied to clipboard",
        })
      })
      .catch((err) => {
        console.error("Failed to copy:", err)
        toast({
          title: "Failed to copy",
          description: "Could not copy the link to clipboard",
          variant: "destructive",
        })
      })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <Skeleton className="h-24 w-24 md:h-36 md:w-36 rounded-full" />
          <div className="flex-1 space-y-4 text-center md:text-left">
            <Skeleton className="h-8 w-48 mx-auto md:mx-0" />
            <Skeleton className="h-4 w-64 mx-auto md:mx-0" />
            <div className="flex justify-center md:justify-start gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>

        <Skeleton className="h-12 w-full" />

        <div className="grid grid-cols-3 gap-1">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
        <p className="text-muted-foreground">The user you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => router.push("/dashboard")} className="mt-6">
          Go to Dashboard
        </Button>
      </div>
    )
  }

  const userInitials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const joinedDate = user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : "Recently"

  const isCurrentUser = currentUser && currentUser.uid === userId

  // Instagram-style grid layout for posts
  const renderPostGrid = (postsToRender: PostType[]) => {
    if (postsToRender.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No posts yet</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-3 gap-1">
        {postsToRender.map((post) => (
          <div
            key={post.id}
            className="aspect-square relative overflow-hidden cursor-pointer"
            onClick={() => router.push(`/post/${post.id}`)}
          >
            {post.mediaURLs && post.mediaURLs.length > 0 ? (
              post.mediaTypes?.[0] === "image" ? (
                <Image
                  src={post.mediaURLs[0] || "/placeholder.svg"}
                  alt="Post"
                  fill
                  className="object-cover hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full bg-black flex items-center justify-center">
                  <video src={post.mediaURLs[0]} className="max-h-full max-w-full object-contain" />
                </div>
              )
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
                {post.content.length > 50 ? post.content.substring(0, 50) + "..." : post.content}
              </div>
            )}

            {/* Overlay with post stats */}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              <div className="flex items-center">
                <Heart className="h-5 w-5 mr-1 fill-white" />
                <span>{post.likesCount || 0}</span>
              </div>
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-1" />
                <span>{post.commentsCount || 0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Profile Header - Instagram Style */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* Profile Picture */}
        <Avatar className="h-24 w-24 md:h-36 md:w-36 border-2 border-background">
          <AvatarImage src={user.photoURL || ""} />
          <AvatarFallback className="text-4xl">{userInitials}</AvatarFallback>
        </Avatar>

        {/* Profile Info */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="text-xl font-semibold">{user.displayName}</h1>
              {user.status === "online" && <span className="h-2 w-2 rounded-full bg-green-500"></span>}
            </div>

            {user.username && <p className="text-muted-foreground">@{user.username}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            {isCurrentUser ? (
              <>
                <Button variant="outline" onClick={() => setEditDialogOpen(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => router.push("/settings")}>
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleFollow}
                  className={`gap-2 ${isFollowed ? "bg-secondary" : "connect-bg"}`}
                  disabled={followLoading}
                >
                  <Users className="h-4 w-4" />
                  {followLoading ? "Loading..." : isFollowed ? "Following" : "Follow"}
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleMessage}>
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex justify-center md:justify-start gap-6">
            <button className="text-center" onClick={() => setFollowersDialogOpen(true)}>
              <div className="font-bold">{user.followersCount || 0}</div>
              <div className="text-muted-foreground text-sm">followers</div>
            </button>
            <div className="text-center">
              <div className="font-bold">{posts.length}</div>
              <div className="text-muted-foreground text-sm">posts</div>
            </div>
            <button className="text-center" onClick={() => setFollowingDialogOpen(true)}>
              <div className="font-bold">{user.followingCount || 0}</div>
              <div className="text-muted-foreground text-sm">following</div>
            </button>
          </div>

          {/* Bio and Details */}
          <div className="space-y-2">
            {user.bio && <p className="whitespace-pre-line">{user.bio}</p>}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{user.location}</span>
                </div>
              )}

              {user.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" />
                  <a
                    href={user.website.startsWith("http") ? user.website : `https://${user.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {user.website.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Joined {joinedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instagram-style Tabs */}
      <Tabs defaultValue="posts">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="posts" className="gap-2">
            <Grid className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-2">
            <Bookmark className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Saved</span>
          </TabsTrigger>
          <TabsTrigger value="tagged" className="gap-2">
            <Tag className="h-4 w-4" />
            <span className="sr-only md:not-sr-only">Tagged</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          {renderPostGrid(posts)}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {isCurrentUser ? (
            renderPostGrid(likedPosts)
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">This user's saved posts are private</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tagged" className="mt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No tagged posts yet</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={isCurrentUser && currentUser ? user : null}
      />

      {/* Followers Dialog */}
      <FollowersDialog
        open={followersDialogOpen}
        onOpenChange={setFollowersDialogOpen}
        followers={followers}
        username={user.displayName}
      />

      {/* Following Dialog */}
      <FollowingDialog
        open={followingDialogOpen}
        onOpenChange={setFollowingDialogOpen}
        following={following}
        username={user.displayName}
      />
    </div>
  )
}

