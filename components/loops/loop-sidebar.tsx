"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ref, onValue, off, get } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { CreateLoopDialog } from "./create-loop-dialog"
import { safeGet } from "@/lib/db-helpers"
import { Skeleton } from "@/components/ui/skeleton"

interface Loop {
  id: string
  name: string
  description: string
  category: string
  imageUrl?: string
  memberCount: number
  createdBy: string
  createdAt: string
}

export function LoopSidebar() {
  const { user } = useAuth()
  const [loops, setLoops] = useState<Loop[]>([])
  const [popularLoops, setPopularLoops] = useState<Loop[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    async function fetchLoops() {
      if (!user?.uid) return

      // Fetch user's loops
      const userLoopsSnapshot = await safeGet(`users/${user.uid}/loops`)
      let userLoopIds: string[] = []

      if (userLoopsSnapshot.exists()) {
        userLoopIds = Object.keys(userLoopsSnapshot.val())
      }

      // Get loop details for each loop ID
      const userLoopsPromises = userLoopIds.map(async (loopId) => {
        const loopSnapshot = await safeGet(`loops/${loopId}`)
        if (loopSnapshot.exists()) {
          const loopData = loopSnapshot.val()
          return {
            id: loopId,
            ...loopData,
          } as Loop
        }
        return null
      })

      const userLoopsData = (await Promise.all(userLoopsPromises)).filter(Boolean) as Loop[]
      setLoops(userLoopsData)

      // Fetch popular loops
      const loopsRef = ref(db, "loops")
      const loopsSnapshot = await get(loopsRef)

      if (loopsSnapshot.exists()) {
        const allLoops: Loop[] = []
        loopsSnapshot.forEach((childSnapshot) => {
          allLoops.push({
            id: childSnapshot.key as string,
            ...childSnapshot.val(),
          } as Loop)
        })

        // Sort by member count and take top 5
        const popular = allLoops.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0)).slice(0, 5)

        setPopularLoops(popular)
      }

      setLoading(false)
    }

    fetchLoops()

    // Set up real-time listener for changes to user's loops
    if (user?.uid) {
      const userLoopsRef = ref(db, `users/${user.uid}/loops`)

      const unsubscribe = onValue(userLoopsRef, (snapshot) => {
        // When user's loops change, re-fetch all loops
        fetchLoops()
      })

      return () => off(userLoopsRef, "value", unsubscribe)
    }
  }, [user?.uid])

  if (loading) {
    return (
      <div className="w-64 p-4 border-r min-h-screen">
        <h2 className="font-semibold mb-4">Your Loops</h2>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full mb-2" />
        ))}

        <h2 className="font-semibold mt-6 mb-4">Popular Loops</h2>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full mb-2" />
        ))}
      </div>
    )
  }

  return (
    <div className="w-64 p-4 border-r min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold">Your Loops</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsDialogOpen(true)} title="Create new loop">
          <PlusCircle className="h-5 w-5" />
        </Button>
      </div>

      {loops.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-4">You haven&apos;t joined any loops yet.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {loops.map((loop) => (
            <li key={loop.id}>
              <Link
                href={`/loops/${loop.id}`}
                className="text-sm hover:underline flex items-center p-2 hover:bg-accent rounded-md"
              >
                {loop.imageUrl ? (
                  <img
                    src={loop.imageUrl || "/placeholder.svg"}
                    alt={loop.name}
                    className="h-6 w-6 rounded-full mr-2"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-primary/10 mr-2" />
                )}
                {loop.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="font-semibold mt-6 mb-4">Popular Loops</h2>
      <ul className="space-y-2">
        {popularLoops.map((loop) => (
          <li key={loop.id}>
            <Link
              href={`/loops/${loop.id}`}
              className="text-sm hover:underline flex items-center p-2 hover:bg-accent rounded-md"
            >
              {loop.imageUrl ? (
                <img src={loop.imageUrl || "/placeholder.svg"} alt={loop.name} className="h-6 w-6 rounded-full mr-2" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/10 mr-2" />
              )}
              {loop.name}
            </Link>
          </li>
        ))}
      </ul>

      <CreateLoopDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}

