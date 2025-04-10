"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ref, get, update, onValue, off } from "firebase/database"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/contexts/auth-context"
import { formatDistanceToNow, isPast } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Clock } from "lucide-react"

interface PollOption {
  text: string
  votes: number
}

interface Poll {
  id: string
  authorId: string
  authorName: string
  authorPhotoURL: string | null
  question: string
  options: Record<string, PollOption>
  totalVotes: number
  createdAt: string
  endsAt: string
  active: boolean
  userVotes?: Record<string, string> // userId -> optionId
}

interface PollCardProps {
  pollId: string
}

export function PollCard({ pollId }: PollCardProps) {
  const { user } = useAuth()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  useEffect(() => {
    const pollRef = ref(db, `polls/${pollId}`)

    const unsubscribe = onValue(pollRef, (snapshot) => {
      if (snapshot.exists()) {
        const pollData = snapshot.val()
        setPoll({
          id: snapshot.key as string,
          ...pollData,
        })

        // Check if user has already voted
        if (user?.uid && pollData.userVotes && pollData.userVotes[user.uid]) {
          setSelectedOption(pollData.userVotes[user.uid])
        }

        // Calculate time left
        if (pollData.endsAt) {
          const endDate = new Date(pollData.endsAt)
          if (isPast(endDate)) {
            setTimeLeft("Ended")
          } else {
            setTimeLeft(formatDistanceToNow(endDate, { addSuffix: true }))
          }
        }
      }

      setLoading(false)
    })

    return () => off(pollRef, "value", unsubscribe)
  }, [pollId, user?.uid])

  // Update time left every minute
  useEffect(() => {
    if (!poll?.endsAt) return

    const interval = setInterval(() => {
      const endDate = new Date(poll.endsAt)
      if (isPast(endDate)) {
        setTimeLeft("Ended")
        clearInterval(interval)
      } else {
        setTimeLeft(formatDistanceToNow(endDate, { addSuffix: true }))
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [poll?.endsAt])

  const handleVote = async () => {
    if (!user?.uid || !poll || !selectedOption) return

    setVoting(true)

    try {
      // Check if poll is still active
      const pollRef = ref(db, `polls/${pollId}`)
      const snapshot = await get(pollRef)

      if (!snapshot.exists()) {
        throw new Error("Poll not found")
      }

      const pollData = snapshot.val()

      if (!pollData.active || isPast(new Date(pollData.endsAt))) {
        throw new Error("Poll has ended")
      }

      // Check if user has already voted
      const userVoteRef = ref(db, `polls/${pollId}/userVotes/${user.uid}`)
      const userVoteSnapshot = await get(userVoteRef)

      if (userVoteSnapshot.exists()) {
        // User has already voted, update their vote
        const previousVote = userVoteSnapshot.val()

        // Decrement previous option vote count
        await update(ref(db, `polls/${pollId}/options/${previousVote}`), {
          votes: pollData.options[previousVote].votes - 1,
        })

        // Increment new option vote count
        await update(ref(db, `polls/${pollId}/options/${selectedOption}`), {
          votes: pollData.options[selectedOption].votes + 1,
        })

        // Update user vote
        await update(userVoteRef, selectedOption)
      } else {
        // User hasn't voted yet
        // Increment option vote count
        await update(ref(db, `polls/${pollId}/options/${selectedOption}`), {
          votes: pollData.options[selectedOption].votes + 1,
        })

        // Record user vote
        await update(userVoteRef, selectedOption)

        // Increment total votes
        await update(ref(db, `polls/${pollId}`), {
          totalVotes: (pollData.totalVotes || 0) + 1,
        })
      }
    } catch (error) {
      console.error("Error voting:", error)
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-5 w-full mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!poll) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p>Poll not found</p>
        </CardContent>
      </Card>
    )
  }

  const isPollEnded = !poll.active || isPast(new Date(poll.endsAt))
  const hasVoted = user?.uid && poll.userVotes && poll.userVotes[user.uid]
  const showResults = isPollEnded || hasVoted

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={poll.authorPhotoURL || ""} />
              <AvatarFallback>{poll.authorName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm">{poll.authorName}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timeLeft}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <h3 className="font-medium mb-4">{poll.question}</h3>

        <div className="space-y-3">
          {Object.entries(poll.options).map(([optionId, option]) => {
            const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0

            return showResults ? (
              <div key={optionId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{option.text}</span>
                  <span className="text-sm font-medium">{percentage}%</span>
                </div>
                <Progress
                  value={percentage}
                  className={selectedOption === optionId ? "h-3 bg-primary/20" : "h-3 bg-muted"}
                />
                <p className="text-xs text-muted-foreground">{option.votes} votes</p>
              </div>
            ) : (
              <Button
                key={optionId}
                variant={selectedOption === optionId ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedOption(optionId)}
              >
                {option.text}
              </Button>
            )
          })}
        </div>

        {!showResults && <div className="mt-4 text-xs text-muted-foreground">{poll.totalVotes} votes so far</div>}
      </CardContent>

      {!isPollEnded && !hasVoted && (
        <CardFooter>
          <Button onClick={handleVote} disabled={!selectedOption || voting || !user} className="w-full">
            {voting ? "Voting..." : "Vote"}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

