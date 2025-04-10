"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lock, Play, ShoppingCart, Loader2 } from "lucide-react"
import { type PaidLoop, purchasePaidLoop, hasUserPurchasedLoop } from "@/lib/paid-loop-service"
import { useAuth } from "@/components/auth/auth-provider"
import { toast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"

interface PaidLoopCardProps {
  loop: PaidLoop
  isPurchased?: boolean
}

export function PaidLoopCard({ loop, isPurchased = false }: PaidLoopCardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [purchased, setPurchased] = useState(isPurchased)

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to purchase this content",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      // Check if already purchased
      if (!purchased) {
        const alreadyPurchased = await hasUserPurchasedLoop(user.uid, loop.id)

        if (alreadyPurchased) {
          setPurchased(true)
          toast({
            title: "Already purchased",
            description: "You already own this content",
            variant: "default",
          })
          router.push(`/loops/paid/${loop.id}`)
          return
        }
      }

      // Purchase the loop
      const result = await purchasePaidLoop(user.uid, loop.id)

      if (result.success) {
        setPurchased(true)
        toast({
          title: "Purchase successful",
          description: result.message,
          variant: "default",
        })
        router.push(`/loops/paid/${loop.id}`)
      } else {
        throw new Error(result.message || "Purchase failed")
      }
    } catch (error) {
      console.error("Error purchasing loop:", error)
      toast({
        title: "Purchase failed",
        description: error instanceof Error ? error.message : "There was an error processing your purchase",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleView = () => {
    router.push(`/loops/paid/${loop.id}`)
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Preview Image or Video */}
        {loop.previewImageUrl ? (
          <img
            src={loop.previewImageUrl || "/placeholder.svg"}
            alt={loop.title}
            className="w-full aspect-video object-cover"
          />
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground opacity-50" />
          </div>
        )}

        {/* Price Badge */}
        <Badge className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm" variant="outline">
          ${(loop.price / 100).toFixed(2)}
        </Badge>

        {/* Lock Icon for Unpurchased Content */}
        {!purchased && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Lock className="h-12 w-12 text-white opacity-70" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold line-clamp-1">{loop.title}</h3>
            {loop.isExclusive && (
              <Badge variant="secondary" className="text-xs">
                Exclusive
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <img
              src={loop.creatorPhotoUrl || "/placeholder.svg?height=24&width=24"}
              alt={loop.creatorName}
              className="h-6 w-6 rounded-full"
            />
            <span className="text-sm text-muted-foreground">{loop.creatorName}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDistanceToNow(loop.createdAt, { addSuffix: true })}</span>
            <span>{loop.duration}s</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        {purchased ? (
          <Button variant="default" className="w-full" onClick={handleView}>
            <Play className="mr-2 h-4 w-4" />
            Watch Now
          </Button>
        ) : (
          <Button variant="default" className="w-full" onClick={handlePurchase} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Purchase
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

