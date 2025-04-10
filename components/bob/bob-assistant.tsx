"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/components/auth/auth-provider"
import { getBobGreeting, getBobResponse } from "@/lib/bob-assistant-service-enhanced"
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { hasActiveSubscription, SUBSCRIPTION_TIERS } from "@/lib/subscription-service"

interface Message {
  id: string
  content: string
  sender: "user" | "bob"
  timestamp: number
  suggestions?: string[]
  isAIGenerated?: boolean
}

export function BobAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check if user has premium subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (user) {
        const hasPremium = await hasActiveSubscription(user.uid, SUBSCRIPTION_TIERS.PREMIUM)
        setIsPremium(hasPremium)
      }
    }

    checkSubscription()
  }, [user])

  // Fetch initial greeting when component mounts
  useEffect(() => {
    const fetchGreeting = async () => {
      if (user) {
        setIsLoading(true)
        try {
          const greeting = await getBobGreeting(user.uid)

          setMessages([
            {
              id: "greeting",
              content: greeting.message,
              sender: "bob",
              timestamp: Date.now(),
              suggestions: [
                "How does content moderation work?",
                "What is healthy roasting?",
                "How can I create a loop?",
              ],
            },
          ])
        } catch (error) {
          console.error("Error fetching BOB greeting:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchGreeting()
  }, [user])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || !user) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Get BOB's response
      const response = await getBobResponse(user.uid, input)

      // Add BOB's response
      const bobMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        sender: "bob",
        timestamp: Date.now(),
        suggestions: response.suggestions,
        isAIGenerated: response.isAIGenerated,
      }

      setMessages((prev) => [...prev, bobMessage])
    } catch (error) {
      console.error("Error getting BOB response:", error)

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble processing your request right now. Please try again later.",
        sender: "bob",
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    // Add user message with suggestion
    const userMessage: Message = {
      id: Date.now().toString(),
      content: suggestion,
      sender: "user",
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Get BOB's response to the suggestion
    if (user) {
      setIsLoading(true)

      getBobResponse(user.uid, suggestion)
        .then((response) => {
          // Add BOB's response
          const bobMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: response.message,
            sender: "bob",
            timestamp: Date.now(),
            suggestions: response.suggestions,
            isAIGenerated: response.isAIGenerated,
          }

          setMessages((prev) => [...prev, bobMessage])
        })
        .catch((error) => {
          console.error("Error getting BOB response:", error)

          // Add error message
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: "I'm having trouble processing your request right now. Please try again later.",
            sender: "bob",
            timestamp: Date.now(),
          }

          setMessages((prev) => [...prev, errorMessage])
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto h-[500px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            BOB Assistant
          </CardTitle>
          {isPremium && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Premium
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[350px] px-4">
          <div className="space-y-4 pt-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex gap-2 max-w-[80%]">
                  {message.sender === "bob" && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/bob-avatar.png" alt="BOB" />
                      <AvatarFallback>BOB</AvatarFallback>
                    </Avatar>
                  )}

                  <div className="flex flex-col gap-2">
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {message.content}
                      {message.isAIGenerated && (
                        <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                          <Sparkles className="h-3 w-3" />
                          AI-powered response
                        </div>
                      )}
                    </div>

                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-auto py-1"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.sender === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
                      <AvatarFallback>{user?.displayName?.charAt(0) || <User className="h-4 w-4" />}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[80%]">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/bob-avatar.png" alt="BOB" />
                    <AvatarFallback>BOB</AvatarFallback>
                  </Avatar>

                  <div className="rounded-lg px-3 py-2 text-sm bg-muted flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="pt-0">
        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
        >
          <Input
            placeholder="Ask BOB a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

