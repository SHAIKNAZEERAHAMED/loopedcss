import { PostCard } from "@/components/post-card"
import { Icons } from "@/components/ui/icons"
import { Card, CardContent } from "@/components/ui/card"
import type { Post } from "@/lib/post-service"

interface PostListProps {
  posts: Post[]
  loading?: boolean
  emptyMessage?: string
}

export function PostList({ posts, loading = false, emptyMessage = "No posts found" }: PostListProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Icons.spinner className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Icons.inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground text-center">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
} 