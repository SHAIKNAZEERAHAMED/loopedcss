"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase/config"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { LoopCard } from "@/components/loops/loop-card"

interface ProfileLoopsProps {
  username: string
}

export function ProfileLoops({ username }: ProfileLoopsProps) {
  const [loops, setLoops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLoops = async () => {
      try {
        // In a real app, you would query by creator.username
        // This is a simplified version
        const loopsQuery = query(
          collection(db, "loops"),
          where("creator.displayName", "==", username),
          orderBy("createdAt", "desc"),
          limit(12),
        )

        const loopsSnapshot = await getDocs(loopsQuery)
        const loopsData = loopsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setLoops(loopsData)
      } catch (error) {
        console.error("Error fetching loops:", error)
        // Fallback to demo data
        setLoops([
          {
            id: "demo-loop-1",
            title: "My First Loop",
            description: "This is a demo loop for the profile page.",
            coverImage: "/placeholder.svg?height=200&width=200",
            creator: {
              uid: "demo-user",
              displayName: username,
              username: username,
              photoURL: "/placeholder.svg?height=40&width=40",
            },
            createdAt: new Date().toISOString(),
            members: 42,
            isPaid: false,
          },
          {
            id: "demo-loop-2",
            title: "Premium Content",
            description: "This is a premium loop with exclusive content.",
            coverImage: "/placeholder.svg?height=200&width=200",
            creator: {
              uid: "demo-user",
              displayName: username,
              username: username,
              photoURL: "/placeholder.svg?height=40&width=40",
            },
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            members: 24,
            isPaid: true,
            price: 4.99,
          },
          {
            id: "demo-loop-3",
            title: "Tech Discussions",
            description: "A loop for discussing the latest in technology.",
            coverImage: "/placeholder.svg?height=200&width=200",
            creator: {
              uid: "demo-user",
              displayName: username,
              username: username,
              photoURL: "/placeholder.svg?height=40&width=40",
            },
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            members: 128,
            isPaid: false,
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchLoops()
  }, [username])

  if (loading) {
    return <div className="flex justify-center p-8">Loading loops...</div>
  }

  if (loops.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">No loops created yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {loops.map((loop) => (
        <LoopCard key={loop.id} loop={loop} />
      ))}
    </div>
  )
}

