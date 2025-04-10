"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Users, Plus, TrendingUp, Filter } from "lucide-react"
import {
  type Loop,
  getLoopsByGenre,
  getTrendingLoops,
  getUserLoops,
  loopGenres,
  joinLoop,
  leaveLoop,
} from "@/lib/loop-service"
import { CreateLoopDialog } from "@/components/loops/create-loop-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function LoopsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [pageLoading, setPageLoading] = useState(true)
  const [trendingLoops, setTrendingLoops] = useState<Loop[]>([])
  const [userLoops, setUserLoops] = useState<{ loop: Loop; role: string }[]>([])
  const [genreLoops, setGenreLoops] = useState<Loop[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGenre, setSelectedGenre] = useState<string>("Technology")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joiningLoopId, setJoiningLoopId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    } else if (user) {
      const fetchData = async () => {
        try {
          const [trending, userLoopsData, genreData] = await Promise.all([
            getTrendingLoops(10),
            getUserLoops(user.uid),
            getLoopsByGenre(selectedGenre, 6),
          ])

          setTrendingLoops(trending)
          setUserLoops(userLoopsData)
          setGenreLoops(genreData)
        } catch (error) {
          console.error("Error fetching loops data:", error)
          toast({
            title: "Error",
            description: "Failed to load loops. Please try again.",
            variant: "destructive",
          })
        } finally {
          setPageLoading(false)
        }
      }

      fetchData()
    }
  }, [user, loading, router, toast, selectedGenre])

  const handleGenreChange = (genre: string) => {
    setSelectedGenre(genre)
  }

  const handleJoinLoop = async (loopId: string) => {
    if (!user) return

    setJoiningLoopId(loopId)

    try {
      await joinLoop(loopId, user.uid, user.displayName || "Unknown User", user.photoURL || undefined)

      // Update user loops
      const updatedUserLoops = await getUserLoops(user.uid)
      setUserLoops(updatedUserLoops)

      toast({
        title: "Joined Loop",
        description: "You have successfully joined this loop.",
      })
    } catch (error) {
      console.error("Error joining loop:", error)
      toast({
        title: "Error",
        description: "Failed to join loop. Please try again.",
        variant: "destructive",
      })
    } finally {
      setJoiningLoopId(null)
    }
  }

  const handleLeaveLoop = async (loopId: string) => {
    if (!user) return

    setJoiningLoopId(loopId)

    try {
      await leaveLoop(loopId, user.uid)

      // Update user loops
      const updatedUserLoops = await getUserLoops(user.uid)
      setUserLoops(updatedUserLoops)

      toast({
        title: "Left Loop",
        description: "You have successfully left this loop.",
      })
    } catch (error) {
      console.error("Error leaving loop:", error)
      toast({
        title: "Error",
        description: "Failed to leave loop. Please try again.",
        variant: "destructive",
      })
    } finally {
      setJoiningLoopId(null)
    }
  }

  const handleLoopCreated = async (loop: Loop) => {
    // Update trending and user loops
    const [trending, userLoopsData] = await Promise.all([getTrendingLoops(10), getUserLoops(user!.uid)])

    setTrendingLoops(trending)
    setUserLoops(userLoopsData)

    // Navigate to the new loop
    router.push(`/loops/${loop.id}`)
  }

  // Check if user is a member of a loop
  const isLoopMember = (loopId: string) => {
    return userLoops.some((userLoop) => userLoop.loop.id === loopId)
  }

  // Get user's role in a loop
  const getUserLoopRole = (loopId: string) => {
    const userLoop = userLoops.find((ul) => ul.loop.id === loopId)
    return userLoop?.role || null
  }

  // Filter loops based on search query
  const filteredTrendingLoops = trendingLoops.filter(
    (loop) =>
      loop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.genre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredUserLoops = userLoops.filter(
    (userLoop) =>
      userLoop.loop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userLoop.loop.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userLoop.loop.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userLoop.loop.genre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredGenreLoops = genreLoops.filter(
    (loop) =>
      loop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loop.genre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Discovering Loops for you...</p>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Loops</h1>
            <p className="text-muted-foreground">Discover and join real-time communities based on your interests</p>
          </div>
          <Button className="connect-bg hover:bg-opacity-90" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Loop
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for Loops by name, description, or category"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedGenre} onValueChange={handleGenreChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Genre" />
              </SelectTrigger>
              <SelectContent>
                {loopGenres.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Loops</TabsTrigger>
            <TabsTrigger value="joined">My Loops</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrendingLoops.length === 0 ? (
                <div className="col-span-3 text-center py-12">
                  <p className="text-muted-foreground">No loops found matching your search.</p>
                </div>
              ) : (
                filteredTrendingLoops.map((loop) => (
                  <LoopCard
                    key={loop.id}
                    loop={loop}
                    isJoined={isLoopMember(loop.id)}
                    userRole={getUserLoopRole(loop.id)}
                    onJoin={() => handleJoinLoop(loop.id)}
                    onLeave={() => handleLeaveLoop(loop.id)}
                    isLoading={joiningLoopId === loop.id}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="joined">
            {filteredUserLoops.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No Loops joined yet</h3>
                <p className="text-muted-foreground mb-6">Join some Loops to see them here</p>
                <Button
                  className="connect-bg hover:bg-opacity-90"
                  onClick={() => document.querySelector('[data-value="discover"]')?.click()}
                >
                  Discover Loops
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUserLoops.map((userLoop) => (
                  <LoopCard
                    key={userLoop.loop.id}
                    loop={userLoop.loop}
                    isJoined={true}
                    userRole={userLoop.role}
                    onLeave={() => handleLeaveLoop(userLoop.loop.id)}
                    isLoading={joiningLoopId === userLoop.loop.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="discover">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">{selectedGenre} Communities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGenreLoops.length === 0 ? (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-muted-foreground">No loops found in this genre matching your search.</p>
                  </div>
                ) : (
                  filteredGenreLoops.map((loop) => (
                    <LoopCard
                      key={loop.id}
                      loop={loop}
                      isJoined={isLoopMember(loop.id)}
                      userRole={getUserLoopRole(loop.id)}
                      onJoin={() => handleJoinLoop(loop.id)}
                      onLeave={() => handleLeaveLoop(loop.id)}
                      isLoading={joiningLoopId === loop.id}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Trending Loops</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTrendingLoops.slice(0, 3).map((loop) => (
                  <LoopCard
                    key={loop.id}
                    loop={loop}
                    isJoined={isLoopMember(loop.id)}
                    userRole={getUserLoopRole(loop.id)}
                    onJoin={() => handleJoinLoop(loop.id)}
                    onLeave={() => handleLeaveLoop(loop.id)}
                    isLoading={joiningLoopId === loop.id}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateLoopDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onLoopCreated={handleLoopCreated} />
    </DashboardLayout>
  )
}

interface LoopCardProps {
  loop: Loop
  isJoined: boolean
  userRole: string | null
  onJoin?: () => void
  onLeave?: () => void
  isLoading?: boolean
}

function LoopCard({ loop, isJoined, userRole, onJoin, onLeave, isLoading = false }: LoopCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/loops/${loop.id}`)
  }

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click

    if (isJoined) {
      onLeave?.()
    } else {
      onJoin?.()
    }
  }

  return (
    <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
      <div className="h-3" style={{ backgroundColor: loop.color }} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: loop.color }}
            >
              <Users className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{loop.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Badge variant="outline" className="rounded-sm text-xs font-normal">
                  {loop.category}
                </Badge>
                <span>•</span>
                <span>{loop.genre}</span>
              </CardDescription>
            </div>
          </div>
          <Badge variant={isJoined ? "outline" : "secondary"}>
            {userRole === "admin" ? "Admin" : userRole === "moderator" ? "Mod" : isJoined ? "Joined" : "Join"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{loop.description}</p>
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{loop.memberCount.toLocaleString()} members</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>{loop.postCount} posts</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          variant={isJoined ? "outline" : "default"}
          className={isJoined ? "" : "connect-bg hover:bg-opacity-90"}
          onClick={handleActionClick}
          disabled={isLoading || userRole === "admin"}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isJoined ? "Leaving..." : "Joining..."}
            </>
          ) : isJoined ? (
            "View Loop"
          ) : (
            "Join Loop"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

