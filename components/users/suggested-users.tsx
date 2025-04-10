"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users } from "lucide-react"
import { ref, get } from "firebase/database"
import { db } from "../../lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { followUser } from "@/lib/user-service"
import Link from "next/link"

interface SuggestedUser {
  id: string
  displayName: string
  photoURL: string | null
  bio?: string
  followersCount: number
  isFollowing?: boolean
}

export function SuggestedUsers() {
  const { user } = useAuth()
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSuggestedUsers() {
      if (!user?.uid) return

      try {
        // Get current user's following list
        const userFollowingRef = ref(db, `users/${user.uid}/following`)
        const userFollowingSnapshot = await get(userFollowingRef)

        const followingIds = userFollowingSnapshot.exists() ? Object.keys(userFollowingSnapshot.val()) : []

        // Get all users
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        if (!usersSnapshot.exists()) {
          setSuggestedUsers([])
          setLoading(false)
          return
        }

        const users: SuggestedUser[] = []

        usersSnapshot.forEach((childSnapshot) => {
          const userId = childSnapshot.key as string
          const userData = childSnapshot.val()

          // Skip current user and users already followed
          if (userId === user.uid || followingIds.includes(userId)) {
            return
          }

          const followersCount = userData.followers ? Object.keys(userData.followers).length : 0

          users.push({
            id: userId,
            displayName: userData.displayName || "User",
            photoURL: userData.photoURL,
            bio: userData.bio,
            followersCount,
            isFollowing: false,
          })
        })

        // Sort by followers count (descending)
        users.sort((a, b) => b.followersCount - a.followersCount)

        // Take top 5
        setSuggestedUsers(users.slice(0, 5))
      } catch (error) {
        console.error("Error fetching suggested users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSuggestedUsers()
  }, [user?.uid])

  const handleFollow = async (userId: string) => {
    if (!user?.uid) return

    try {
      await followUser(user.uid, userId)

      // Update local state
      setSuggestedUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: true, followersCount: u.followersCount + 1 } : u)),
      )
    } catch (error) {
      console.error("Error following user:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <Users className="h-4 w-4" />
            Suggested Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestedUsers.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          <Users className="h-4 w-4" />
          Suggested Users
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestedUsers.map((suggestedUser) => (
            <div key={suggestedUser.id} className="flex items-center justify-between">
              <Link href={`/profile/${suggestedUser.id}`} className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={suggestedUser.photoURL || ""} />
                  <AvatarFallback>{suggestedUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{suggestedUser.displayName}</p>
                  <p className="text-xs text-muted-foreground">{suggestedUser.followersCount} followers</p>
                </div>
              </Link>

              <Button
                variant={suggestedUser.isFollowing ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleFollow(suggestedUser.id)}
                disabled={suggestedUser.isFollowing}
              >
                {suggestedUser.isFollowing ? "Following" : "Follow"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

