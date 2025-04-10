"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Calendar, LinkIcon, Grid, Heart, Settings, Edit, Users, MessageSquare, Tag } from "lucide-react"
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
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { FollowersDialog } from "@/components/profile/followers-dialog"
import { FollowingDialog } from "@/components/profile/following-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Icons } from "@/components/ui/icons"
import { PostList } from "@/components/post-list"
import { cn } from "@/lib/utils"
import type { Post } from "@/lib/post-service"

interface UserProfileData extends User {
  username: string
  displayName: string
  avatarUrl?: string
  bio?: string
  postsCount: number
  followersCount: number
  followingCount: number
  isCurrentUser: boolean
  isFollowing: boolean
  createdAt: string
}

interface UserProfileProps {
  username: string
}

export function UserProfile({ username }: UserProfileProps) {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowed, setIsFollowed] = useState(false)
  const [followers, setFollowers] = useState<User[]>([])
  const [following, setFollowing] = useState<User[]>([])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false)
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false)
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const userProfile = await fetch(`/api/users/${username}`).then(res => res.json())
        const userPosts = await fetch(`/api/users/${username}/posts`).then(res => res.json())
        setProfile(userProfile)
        setPosts(userPosts)
        setIsFollowed(await isFollowing(currentUser?.uid || "", username))
        setFollowers(await getFollowers(username))
        setFollowing(await getFollowing(username))
      } catch (error) {
        console.error("Error loading profile:", error)
        setError("Failed to load profile. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [username, currentUser])

  const handleFollow = async () => {
    if (!currentUser || !profile) return

    try {
      if (isFollowed) {
        await unfollowUser(currentUser.uid, username)
        setIsFollowed(false)
        toast({
          title: `Unfollowed ${profile.displayName}`,
          description: `You have unfollowed ${profile.displayName}`,
        })
      } else {
        await followUser(currentUser.uid, username)
        setIsFollowed(true)
        toast({
          title: `Following ${profile.displayName}`,
          description: `You are now following ${profile.displayName}`,
        })
      }
    } catch (error) {
      console.error("Error following/unfollowing:", error)
      toast({
        title: "Error",
        description: "Failed to update follow status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleMessage = () => {
    if (!profile) return
    // Navigate to messages with this user pre-selected
    router.push(`/messages?user=${username}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Icons.alertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg text-destructive font-medium mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="min-w-[120px]"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const userInitials = profile.displayName
    ? profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U"

  const joinedDate = profile.createdAt ? formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true }) : "Recently"

  const isCurrentUser = currentUser && currentUser.uid === username

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardContent className="flex items-start space-x-4 py-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            <AvatarFallback>
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-2 text-sm">{profile.bio}</p>
            )}
            <div className="mt-4 flex space-x-4">
              <div>
                <span className="font-medium">{profile.postsCount}</span>
                <span className="text-muted-foreground ml-1">Posts</span>
              </div>
              <div>
                <span className="font-medium">{profile.followersCount}</span>
                <span className="text-muted-foreground ml-1">Followers</span>
              </div>
              <div>
                <span className="font-medium">{profile.followingCount}</span>
                <span className="text-muted-foreground ml-1">Following</span>
              </div>
            </div>
          </div>
          {profile.isCurrentUser ? (
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              Edit Profile
            </Button>
          ) : (
            <Button
              variant={isFollowed ? "outline" : "default"}
              className={cn(
                "min-w-[100px]",
                isFollowed && "bg-background"
              )}
              onClick={handleFollow}
            >
              {isFollowed ? "Following" : "Follow"}
            </Button>
          )}
        </CardContent>
      </Card>

      <PostList 
        posts={posts}
        emptyMessage={`${profile.displayName} hasn't posted anything yet`}
      />

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={isCurrentUser && currentUser ? profile : null}
      />

      {/* Followers Dialog */}
      <FollowersDialog
        open={followersDialogOpen}
        onOpenChange={setFollowersDialogOpen}
        followers={followers}
        username={profile.displayName}
      />

      {/* Following Dialog */}
      <FollowingDialog
        open={followingDialogOpen}
        onOpenChange={setFollowingDialogOpen}
        following={following}
        username={profile.displayName}
      />
    </div>
  )
}

