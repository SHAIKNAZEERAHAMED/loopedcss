"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, TrendingUp, Users, Hash, Compass } from "lucide-react"
import { ref, get, query, orderByChild, limitToLast } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import type { Post } from "@/lib/post-service"
import { followUser } from "@/lib/user-service"

export default function ExploreContent() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([])
  const [trendingUsers, setTrendingUsers] = useState<any[]>([])
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("trending")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    async function fetchExploreData() {
      setLoading(true)

      try {
        // Fetch trending posts (most likes)
        const postsRef = ref(db, "posts")
        const postsQuery = query(postsRef, orderByChild("likesCount"), limitToLast(10))
        const postsSnapshot = await get(postsQuery)

        if (postsSnapshot.exists()) {
          const posts: Post[] = []
          postsSnapshot.forEach((childSnapshot) => {
            posts.push({
              id: childSnapshot.key as string,
              ...childSnapshot.val(),
            } as Post)
          })

          // Sort by likes count (descending)
          posts.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
          setTrendingPosts(posts)
        }

        // Fetch trending users (most followers)
        const usersRef = ref(db, "users")
        const usersSnapshot = await get(usersRef)

        if (usersSnapshot.exists()) {
          const users: any[] = []
          usersSnapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val()
            const followersCount = userData.followers ? Object.keys(userData.followers).length : 0

            users.push({
              id: childSnapshot.key,
              displayName: userData.displayName || "User",
              photoURL: userData.photoURL,
              bio: userData.bio || "",
              followersCount,
            })
          })

          // Sort by followers count (descending)
          users.sort((a, b) => b.followersCount - a.followersCount)
          setTrendingUsers(users.slice(0, 10))
        }

        // Extract trending hashtags from posts
        const allTags = new Map<string, number>()

        if (postsSnapshot.exists()) {
          postsSnapshot.forEach((childSnapshot) => {
            const post = childSnapshot.val() as Post

            if (post.content) {
              // Extract hashtags from content
              const hashtags = post.content.match(/#[\w\u0590-\u05ff]+/g) || []

              hashtags.forEach((tag) => {
                const count = allTags.get(tag) || 0
                allTags.set(tag, count + 1)
              })
            }
          })
        }

        // Convert to array and sort by count
        const tagsArray = Array.from(allTags.entries()).map(([tag, count]) => ({ tag, count }))
        tagsArray.sort((a, b) => b.count - a.count)

        setTrendingTags(tagsArray.slice(0, 10))
      } catch (error) {
        console.error("Error fetching explore data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchExploreData()
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearchLoading(true)
    setActiveTab("search")

    try {
      const results: any[] = []

      // Search posts
      const postsRef = ref(db, "posts")
      const postsSnapshot = await get(postsRef)

      if (postsSnapshot.exists()) {
        postsSnapshot.forEach((childSnapshot) => {
          const post = childSnapshot.val() as Post

          if (post.content && post.content.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              type: "post",
              postId: childSnapshot.key,
              ...post,
            })
          }
        })
      }

      // Search users
      const usersRef = ref(db, "users")
      const usersSnapshot = await get(usersRef)

      if (usersSnapshot.exists()) {
        usersSnapshot.forEach((childSnapshot) => {
          const userData = childSnapshot.val()

          if (userData.displayName && userData.displayName.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              type: "user",
              userId: childSnapshot.key,
              ...userData,
            })
          }
        })
      }

      // Search loops
      const loopsRef = ref(db, "loops")
      const loopsSnapshot = await get(loopsRef)

      if (loopsSnapshot.exists()) {
        loopsSnapshot.forEach((childSnapshot) => {
          const loopData = childSnapshot.val()

          if (
            (loopData.name && loopData.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (loopData.description && loopData.description.toLowerCase().includes(searchQuery.toLowerCase()))
          ) {
            results.push({
              type: "loop",
              loopId: childSnapshot.key,
              ...loopData,
            })
          }
        })
      }

      setSearchResults(results)
    } catch (error) {
      console.error("Error searching:", error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleFollow = async (userId: string) => {
    if (!user?.uid) return

    try {
      await followUser(user.uid, userId)

      // Update local state
      setTrendingUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, followersCount: u.followersCount + 1, isFollowing: true } : u)),
      )
    } catch (error) {
      console.error("Error following user:", error)
    }
  }

  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (searchResults.length === 0) {
      return (
        <div className="text-center p-8">
          <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {searchResults.map((result) => {
          if (result.type === "post") {
            return (
              <Card key={`post-${result.postId}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={result.authorPhotoURL || ""} />
                      <AvatarFallback>{result.authorName?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-sm">{result.authorName}</CardTitle>
                      <CardDescription className="text-xs">
                        {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{result.content}</p>
                  {result.mediaURLs && result.mediaURLs.length > 0 && (
                    <div className="mt-2">
                      <img
                        src={result.mediaURLs[0] || "/placeholder.svg"}
                        alt="Post media"
                        className="rounded-md max-h-48 object-cover"
                      />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/post/${result.id}`} className="text-xs text-primary hover:underline">
                    View post
                  </Link>
                </CardFooter>
              </Card>
            )
          } else if (result.type === "user") {
            return (
              <Card key={`user-${result.userId}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={result.photoURL || ""} />
                        <AvatarFallback>{result.displayName?.charAt(0) || "U"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-sm">{result.displayName}</CardTitle>
                        <CardDescription className="text-xs">
                          {result.followers ? Object.keys(result.followers).length : 0} followers
                        </CardDescription>
                      </div>
                    </div>
                    {result.userId !== user?.uid && (
                      <Button variant="outline" size="sm" onClick={() => handleFollow(result.userId)}>
                        Follow
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{result.bio || "No bio available"}</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/profile/${result.userId}`} className="text-xs text-primary hover:underline">
                    View profile
                  </Link>
                </CardFooter>
              </Card>
            )
          } else if (result.type === "loop") {
            return (
              <Card key={`loop-${result.loopId}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    {result.imageUrl ? (
                      <img
                        src={result.imageUrl || "/placeholder.svg"}
                        alt={result.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium">{result.name.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-sm">{result.name}</CardTitle>
                      <CardDescription className="text-xs">{result.memberCount || 0} members</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{result.description}</p>
                  <div className="mt-2">
                    <Badge variant="outline">{result.category}</Badge>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href={`/loops/${result.id}`} className="text-xs text-primary hover:underline">
                    View loop
                  </Link>
                </CardFooter>
              </Card>
            )
          }
        })}
      </div>
    )
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, people, loops..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
            Search
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="trending" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trending</span>
            </TabsTrigger>
            <TabsTrigger value="people" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">People</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Tags</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-1">
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="mt-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-16 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {trendingPosts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={post.authorPhotoURL || ""} />
                          <AvatarFallback>{post.authorName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-sm">{post.authorName}</CardTitle>
                          <CardDescription className="text-xs">
                            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{post.content}</p>
                      {post.mediaURLs && post.mediaURLs.length > 0 && (
                        <div className="mt-2">
                          <img
                            src={post.mediaURLs[0] || "/placeholder.svg"}
                            alt="Post media"
                            className="rounded-md max-h-48 object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-muted-foreground text-xs">
                        <span>{post.likesCount || 0} likes</span>
                        <span>•</span>
                        <span>{post.commentsCount || 0} comments</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Link href={`/post/${post.id}`} className="text-xs text-primary hover:underline">
                        View post
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="people" className="mt-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trendingUsers.map((user) => (
                  <Card key={user.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar>
                            <AvatarImage src={user.photoURL || ""} />
                            <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-sm">{user.displayName}</CardTitle>
                            <CardDescription className="text-xs">{user.followersCount} followers</CardDescription>
                          </div>
                        </div>
                        {user.id !== user?.uid && (
                          <Button
                            variant={user.isFollowing ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => handleFollow(user.id)}
                          >
                            {user.isFollowing ? "Following" : "Follow"}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm line-clamp-2">{user.bio || "No bio available"}</p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Link href={`/profile/${user.id}`} className="text-xs text-primary hover:underline">
                        View profile
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trendingTags.map((tag) => (
                  <Card key={tag.tag} className="hover:bg-accent/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{tag.tag}</CardTitle>
                        <Badge variant="secondary">{tag.count}</Badge>
                      </div>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary p-0 h-auto"
                        onClick={() => {
                          setSearchQuery(tag.tag)
                          handleSearch()
                        }}
                      >
                        View posts
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            {renderSearchResults()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

