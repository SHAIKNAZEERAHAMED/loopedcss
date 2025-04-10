"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ref, push, set, serverTimestamp } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { useToast } from "@/components/ui/use-toast"
import { v4 as uuidv4 } from "uuid"

export function CreatePoll() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [duration, setDuration] = useState("1d")
  const [loading, setLoading] = useState(false)

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""])
    } else {
      toast({
        title: "Maximum options reached",
        description: "You can add up to 5 options",
        variant: "destructive",
      })
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options]
      newOptions.splice(index, 1)
      setOptions(newOptions)
    } else {
      toast({
        title: "Minimum options required",
        description: "A poll must have at least 2 options",
        variant: "destructive",
      })
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCreatePoll = async () => {
    if (!user?.uid) return

    // Validate inputs
    if (!question.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question for your poll",
        variant: "destructive",
      })
      return
    }

    const validOptions = options.filter((opt) => opt.trim() !== "")
    if (validOptions.length < 2) {
      toast({
        title: "Options required",
        description: "Please enter at least 2 options",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Calculate end date based on duration
      const now = new Date()
      const endDate = new Date(now)

      switch (duration) {
        case "1h":
          endDate.setHours(now.getHours() + 1)
          break
        case "6h":
          endDate.setHours(now.getHours() + 6)
          break
        case "1d":
          endDate.setDate(now.getDate() + 1)
          break
        case "3d":
          endDate.setDate(now.getDate() + 3)
          break
        case "7d":
          endDate.setDate(now.getDate() + 7)
          break
        default:
          endDate.setDate(now.getDate() + 1)
      }

      // Create poll options object
      const pollOptions: Record<string, { text: string; votes: number }> = {}

      validOptions.forEach((option) => {
        const optionId = uuidv4()
        pollOptions[optionId] = {
          text: option,
          votes: 0,
        }
      })

      // Create poll in database
      const pollsRef = ref(db, "polls")
      const newPollRef = push(pollsRef)

      await set(newPollRef, {
        authorId: user.uid,
        authorName: user.displayName || "User",
        authorPhotoURL: user.photoURL,
        question,
        options: pollOptions,
        totalVotes: 0,
        createdAt: serverTimestamp(),
        endsAt: endDate.toISOString(),
        active: true,
      })

      // Reset form
      setQuestion("")
      setOptions(["", ""])
      setDuration("1d")

      toast({
        title: "Poll created",
        description: "Your poll has been created successfully",
        variant: "default",
      })
    } catch (error) {
      console.error("Error creating poll:", error)
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Poll</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">Question</Label>
          <Input
            id="question"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOption(index)}
                disabled={options.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" className="mt-2" onClick={handleAddOption} disabled={options.length >= 5}>
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <select
            id="duration"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            <option value="1h">1 hour</option>
            <option value="6h">6 hours</option>
            <option value="1d">1 day</option>
            <option value="3d">3 days</option>
            <option value="7d">1 week</option>
          </select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleCreatePoll} disabled={loading} className="w-full">
          {loading ? "Creating..." : "Create Poll"}
        </Button>
      </CardFooter>
    </Card>
  )
}

