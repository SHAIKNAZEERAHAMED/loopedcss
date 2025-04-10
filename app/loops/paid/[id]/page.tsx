"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { PaidLoopViewer } from "@/components/loops/paid-loop-viewer"
import { getPaidLoop } from "@/lib/paid-loop-service"
import { Loader2 } from "lucide-react"

export default function PaidLoopPage() {
  const params = useParams()
  const loopId = params.id as string

  const [loop, setLoop] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLoop = async () => {
      if (!loopId) return

      setLoading(true)
      try {
        const loopData = await getPaidLoop(loopId)

        if (!loopData) {
          setError("Loop not found")
        } else {
          setLoop(loopData)
        }
      } catch (err) {
        console.error("Error fetching loop:", err)
        setError("Error loading content")
      } finally {
        setLoading(false)
      }
    }

    fetchLoop()
  }, [loopId])

  if (loading) {
    return (
      <div className="container py-10 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !loop) {
    return (
      <div className="container py-10 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-2">Content Not Found</h2>
        <p className="text-muted-foreground mb-4">{error || "The requested content could not be found"}</p>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <PaidLoopViewer loop={loop} />
    </div>
  )
}

