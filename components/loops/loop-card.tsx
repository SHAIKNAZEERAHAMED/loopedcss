"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Lock } from "lucide-react"

interface LoopCardProps {
  loop: {
    id: string
    title: string
    description: string
    coverImage: string
    creator: {
      uid: string
      displayName: string
      username: string
      photoURL: string
    }
    members: number
    isPaid: boolean
    price?: number
  }
}

export function LoopCard({ loop }: LoopCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-40">
        <Image src={loop.coverImage || "/placeholder.svg"} alt={loop.title} fill className="object-cover" />
        {loop.isPaid && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            <Lock className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg truncate">{loop.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 h-10">{loop.description}</p>
        <div className="flex items-center mt-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 mr-1" />
          <span>{loop.members.toLocaleString()} members</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div className="flex items-center">
          <div className="relative h-6 w-6 mr-2">
            <Image
              src={loop.creator.photoURL || "/placeholder.svg"}
              alt={loop.creator.displayName}
              fill
              className="rounded-full object-cover"
            />
          </div>
          <span className="text-xs truncate">{loop.creator.displayName}</span>
        </div>
        <Button size="sm" asChild>
          <Link href={`/loops/${loop.id}`}>{loop.isPaid ? `Join $${loop.price?.toFixed(2)}` : "Join"}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

