"use client"

import { useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PostFeed } from "@/components/posts/post-feed"
import { ensureSearchFields } from "@/lib/firebase/config"
import { useToast } from "@/components/ui/use-toast"

export default function DashboardPage() {
  const { toast } = useToast()

  useEffect(() => {
    // Ensure search fields exist in the database
    ensureSearchFields()
      .then(() => {
        console.log("Search fields initialized")
      })
      .catch((error) => {
        console.error("Error initializing search fields:", error)
        toast({
          title: "Database Setup Note",
          description:
            "For optimal search performance, add indexes in your Firebase rules for usernameLower and displayNameLower fields.",
          variant: "default",
          duration: 8000,
        })
      })
  }, [toast])

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 px-4">
        <PostFeed />
      </div>
    </DashboardLayout>
  )
}

