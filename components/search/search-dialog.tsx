"use client"

import { useState, useEffect } from "react"
import { SearchIcon, X, User } from "lucide-react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { searchUsers, type User as UserType } from "@/lib/user-service"
import { Skeleton } from "@/components/ui/skeleton"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [users, setUsers] = useState<UserType[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (searchQuery.length < 2) {
      setUsers([])
      return
    }

    const performSearch = async () => {
      setLoading(true)
      try {
        const userResults = await searchUsers(searchQuery)
        setUsers(userResults)
      } catch (error) {
        console.error("Error searching:", error)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimeout = setTimeout(performSearch, 300)

    return () => clearTimeout(debounceTimeout)
  }, [searchQuery])

  const handleUserClick = (userId: string) => {
    router.push(`/profile/${userId}`)
    onOpenChange(false)
  }

  const handleViewAllResults = () => {
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for people, posts, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none focus-visible:ring-0 pl-0"
              autoFocus
            />
            {searchQuery && (
              <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 border-b">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="users">People</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {searchQuery.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">Start typing to search...</div>
            ) : loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Users section */}
                {activeTab === "all" || activeTab === "users" ? (
                  <div>
                    {activeTab === "all" && <h3 className="font-medium mb-2">People</h3>}

                    {users.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No users found matching "{searchQuery}"
                      </div>
                    ) : (
                      <>
                        {users.slice(0, activeTab === "all" ? 3 : undefined).map((user) => (
                          <div
                            key={user.uid}
                            className="p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => handleUserClick(user.uid)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.photoURL || ""} />
                                <AvatarFallback>{user.displayName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.displayName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {user.username ? `@${user.username}` : ""}
                                </p>
                              </div>
                              <User className="ml-auto h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}

                        {activeTab === "all" && users.length > 3 && (
                          <Button variant="ghost" className="w-full text-primary mt-2" onClick={handleViewAllResults}>
                            View all results
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                ) : null}

                {/* Posts section - placeholder for now */}
                {(activeTab === "all" || activeTab === "posts") && (
                  <div>
                    {activeTab === "all" && <h3 className="font-medium mb-2 mt-6">Posts</h3>}
                    <div className="text-center py-4 text-muted-foreground">Post search coming soon</div>
                  </div>
                )}

                {/* Tags section - placeholder for now */}
                {(activeTab === "all" || activeTab === "tags") && (
                  <div>
                    {activeTab === "all" && <h3 className="font-medium mb-2 mt-6">Tags</h3>}
                    <div className="text-center py-4 text-muted-foreground">Tag search coming soon</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

