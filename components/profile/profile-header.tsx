"use client"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ProfileHeaderProps {
  username: string
  bio?: string
  location?: string
  joinedDate: string
  postsCount: number
  followersCount: number
  followingCount: number
  isCurrentUser?: boolean
  isFollowing?: boolean
  onFollow?: () => void
  onMessage?: () => void
}

export function ProfileHeader({
  username,
  bio,
  location,
  joinedDate,
  postsCount,
  followersCount,
  followingCount,
  isCurrentUser,
  isFollowing,
  onFollow,
  onMessage,
}: ProfileHeaderProps) {
  const { user } = useAuth()

  return (
    <div className="relative">
      <div className="h-32 bg-accent" />
      <div className="px-4">
        <div className="relative flex items-end justify-between">
          <Avatar className="absolute -top-12 h-24 w-24 border-4 border-background">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback>{username[0]}</AvatarFallback>
          </Avatar>
          <div className="ml-28 flex-1">
            <h1 className="text-2xl font-bold">{username}</h1>
            {bio && <p className="mt-1 text-muted-foreground">{bio}</p>}
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              {location && (
                <div className="flex items-center gap-1">
                  <span>{location}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span>Joined {joinedDate}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {!isCurrentUser && (
              <>
                <Button onClick={onMessage} variant="outline">
                  Message
                </Button>
                <Button onClick={onFollow}>
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-4 border-b pb-4">
          <div className="flex items-center gap-1">
            <span className="font-semibold">{postsCount}</span>
            <span className="text-muted-foreground">Posts</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">{followersCount}</span>
            <span className="text-muted-foreground">Followers</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">{followingCount}</span>
            <span className="text-muted-foreground">Following</span>
          </div>
        </div>
      </div>
    </div>
  )
}

