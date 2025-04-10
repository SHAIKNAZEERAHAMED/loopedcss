"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, UserPlus, UserCheck } from "lucide-react"
import { searchUsers, type User } from "@/lib/user-service"
import { useAuth } from "@/components/auth/auth-provider"
import { followUser, unfollowUser, isFollowing } from "@/lib/user-service"
import { useToast } from "@/components/ui/use-toast"

export function UserSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [followStatus, setFollowStatus] = useState<Record<string, boolean>>({})
  const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await searchUsers(searchQuery)
        setSearchResults(results)

        // Check follow status for each user
        if (user) {
          const statusPromises = results.map(async (result) => {
            if (result.uid === user.uid) return { [result.uid]: false }
            const following = await isFollowing(user.uid, result.uid)
            return { [result.uid]: following }
          })

          const statuses = await Promise.all(statusPromises)
          const statusObj = statuses.reduce((acc, curr) => ({ ...acc, ...curr }), {})
          setFollowStatus(statusObj)
        }
      } catch (error) {
        console.error("Error searching users:", error)
      } finally {
        setIsLoading(false)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, user])

  const handleFollowToggle = async (targetUserId: string) => {
    if (!user) return

    setFollowLoading((prev) => ({ ...prev, [targetUserId]: true }))

    try {
      const isFollowed = followStatus[targetUserId]

      if (isFollowed) {
        await unfollowUser(user.uid, targetUserId)
        setFollowStatus((prev) => ({ ...prev, [targetUserId]: false }))
        toast({
          title: "Unfollowed",
          description: "You have unfollowed this user",
        })
      } else {
        await followUser(user.uid, targetUserId)
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

  const handleUserClick = (userId: string) => {
    router.push(`/profile/${userId}`)
  }

  return (
    <div className="w-full">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map((result) => {
            const isCurrentUser = user && result.uid === user.uid
            const isFollowed = followStatus[result.uid]
            const isLoading = followLoading[result.uid]

            return (
              <Card key={result.uid} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="cursor-pointer" onClick={() => handleUserClick(result.uid)}>
                      <AvatarImage src={result.photoURL || ""} />
                      <AvatarFallback>{result.displayName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 cursor-pointer" onClick={() => handleUserClick(result.uid)}>
                      <p className="font-medium">{result.displayName}</p>
                      <p className="text-sm text-muted-foreground">{result.username ? `@${result.username}` : ""}</p>
                    </div>
                    {!isCurrentUser && (
                      <Button
                        variant={isFollowed ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleFollowToggle(result.uid)}
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : searchQuery.trim() ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
        </div>
      ) : null}
    </div>
  )
}

