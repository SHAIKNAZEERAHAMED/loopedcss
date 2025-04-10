"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/auth/auth-provider"
import { createLoop, loopGenres, type Loop } from "@/lib/loop-service"
import { Loader2 } from "lucide-react"

interface CreateLoopDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoopCreated?: (loop: Loop) => void
}

export function CreateLoopDialog({ open, onOpenChange, onLoopCreated }: CreateLoopDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("General")
  const [genre, setGenre] = useState(loopGenres[0])
  const [color, setColor] = useState("#4ECDC4") // Default color
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || isSubmitting) return

    if (!name.trim() || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a name and description for your loop.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const newLoop = await createLoop(
        name,
        description,
        category,
        genre,
        user.uid,
        user.displayName || "Unknown User",
        color,
      )

      toast({
        title: "Loop Created!",
        description: "Your new community has been created successfully.",
      })

      // Reset form
      setName("")
      setDescription("")
      setCategory("General")
      setGenre(loopGenres[0])
      setColor("#4ECDC4")

      // Close dialog
      onOpenChange(false)

      // Notify parent
      if (onLoopCreated) {
        onLoopCreated(newLoop)
      }
    } catch (error) {
      console.error("Error creating loop:", error)
      toast({
        title: "Error",
        description: "Failed to create loop. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Available categories
  const categories = [
    "General",
    "Technology",
    "Creative",
    "Education",
    "Entertainment",
    "Gaming",
    "Health",
    "Lifestyle",
    "News",
    "Science",
    "Sports",
  ]

  // Available colors
  const colors = [
    { name: "Connect", value: "#FF6B6B" },
    { name: "Share", value: "#4ECDC4" },
    { name: "Safe", value: "#87C159" },
    { name: "Purple", value: "#9B59B6" },
    { name: "Blue", value: "#3498DB" },
    { name: "Orange", value: "#E67E22" },
    { name: "Yellow", value: "#F1C40F" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a New Loop</DialogTitle>
            <DialogDescription>
              Create your own community where people can connect, share, and engage in real-time.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Loop Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Give your loop a name"
                maxLength={50}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is your loop about?"
                rows={3}
                maxLength={500}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="genre">Genre</Label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger id="genre">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {loopGenres.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Loop Color</Label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <div
                    key={c.value}
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all ${color === c.value ? "ring-2 ring-offset-2 ring-primary" : "hover:scale-110"}`}
                    style={{ backgroundColor: c.value }}
                    onClick={() => setColor(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Loop"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

