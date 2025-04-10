"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, UserPlus, UserCheck } from "lucide-react"
import { type User, followUser, unfollowUser, isFollowing } from "@/lib/user-service"
import { useAuth } from "@/components/auth/auth-provider"
import { useToast } from "@/components/ui/use-toast"

interface FollowersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  followers: User[]
  username: string
}

export function FollowersDialog({ open, onOpenChange, followers, username }: FollowersDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [followStatus, setFollowStatus] = useState<Record<string, boolean>>({})
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const filteredFollowers = followers.filter(
    (follower) =>
      follower.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (follower.username && follower.username.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleUserClick = (userId: string) => {
    router.push(`/profile/${userId}`)
    onOpenChange(false)
  }

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser) return

    setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }))

    try {
      const isCurrentlyFollowing = await isFollowing(currentUser.uid, targetUserId)

      if (isCurrentlyFollowing) {
        await unfollowUser(currentUser.uid, targetUserId)
        setFollowStatus((prev) => ({ ...prev, [targetUserId]: false }))
        toast({
          title: "Unfollowed",
          description: "You have unfollowed this user",
        })
      } else {
        await followUser(currentUser.uid, targetUserId)
        setFollowStatus((prev) => ({ ...prev, [targetUserId]: true }))
        toast({
          title: "Following",
          description: "You are now following this user",
        })
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      })
    } finally {
      setFollowLoading((prev) => ({ ...prev, [targetUserId]: false }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{username}'s Followers</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search followers"
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[50vh] pr-4">
          {filteredFollowers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No followers match your search" : "No followers yet"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFollowers.map((follower) => {
                const isCurrentUser = currentUser && follower.uid === currentUser.uid
                const userInitials = follower.displayName
                  ? follower.displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "U"

                const isFollowed = followStatus[follower.uid]
                const isLoading = followLoading[follower.uid]

                return (
                  <div key={follower.uid} className="flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => handleUserClick(follower.uid)}
                    >
                      <Avatar>
                        <AvatarImage src={follower.photoURL || ""} />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{follower.displayName}</div>
                        {follower.username && <div className="text-sm text-muted-foreground">@{follower.username}</div>}
                      </div>
                    </div>

                    {!isCurrentUser && currentUser && (
                      <Button
                        variant={isFollowed ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleFollowToggle(follower.uid)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          "Loading..."
                        ) : isFollowed ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

