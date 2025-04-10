"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, Send, X, Minimize2, Maximize2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
}

// Telugu greetings and phrases
const teluguPhrases = [
  "నమస్కారం! నేను BOB, మీ సహాయకుడిని.", // Hello! I am BOB, your assistant.
  "ఎలా ఉన్నారు?", // How are you?
  "నేను మీకు ఎలా సహాయం చేయగలను?", // How can I help you?
  "చాలా బాగుంది!", // Very good!
  "అది చాలా మంచిది!", // That's very nice!
  "మీరు ఏమి చేస్తున్నారు?", // What are you doing?
  "నాకు తెలియదు, కానీ నేను తెలుసుకుంటాను.", // I don't know, but I'll find out.
  "ధన్యవాదాలు!", // Thank you!
  "మళ్ళీ కలుద్దాం!", // See you again!
]

// Telugu-English mixed phrases (Tenglish)
const tenglishPhrases = [
  "Hi andi! BOB here, meeku ela help cheyagalanu?", // Hi! BOB here, how can I help you?
  "Meeru cheppindi correct andi!", // What you said is correct!
  "Idi chala interesting topic!", // This is a very interesting topic!
  "Meeku telusa? Loop(CSS) lo chala features unnai!", // Did you know? Loop(CSS) has many features!
  "Nenu meeku help chestanu, don't worry!", // I will help you, don't worry!
  "Meeru post chala bagundi!", // Your post is very good!
  "Idi chala useful information andi!", // This is very useful information!
  "Meeru ela unnaru today?", // How are you today?
  "Nenu meeku suggestions istanu!", // I will give you suggestions!
]

export function BobAIChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hi there! I'm BOB, your AI assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isMinimized, setIsMinimized] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { user } = useAuth()

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")

    // Simulate BOB's response
    setTimeout(() => {
      const botResponse = generateBotResponse(input)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        sender: "bot",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMessage])
    }, 1000)
  }

  const generateBotResponse = (userInput: string): string => {
    // Simple response logic with Telugu/Tenglish phrases
    const userInputLower = userInput.toLowerCase()

    // Random chance to use Telugu or Tenglish
    const useTeluguOrTenglish = Math.random() > 0.5
    const randomPhrase = useTeluguOrTenglish
      ? teluguPhrases[Math.floor(Math.random() * teluguPhrases.length)]
      : tenglishPhrases[Math.floor(Math.random() * tenglishPhrases.length)]

    // Add random phrase with 30% probability
    const shouldAddPhrase = Math.random() < 0.3

    if (userInputLower.includes("hello") || userInputLower.includes("hi")) {
      return `Hello! ${user?.displayName || "friend"}! How can I assist you today? ${shouldAddPhrase ? randomPhrase : ""}`
    } else if (userInputLower.includes("help")) {
      return `I can help you navigate Loop(CSS), find content, or answer questions about features. ${shouldAddPhrase ? randomPhrase : ""}`
    } else if (userInputLower.includes("thank")) {
      return `You're welcome! I'm always here to help. ${shouldAddPhrase ? randomPhrase : ""}`
    } else if (userInputLower.includes("feature") || userInputLower.includes("loop")) {
      return `Loop(CSS) has many features including AI-powered sentiment analysis, content moderation, and hate speech detection. Would you like to know more about any specific feature? ${shouldAddPhrase ? randomPhrase : ""}`
    } else {
      return `I understand you're interested in "${userInput}". Let me help you with that. ${shouldAddPhrase ? randomPhrase : ""}`
    }
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const toggleOpen = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setIsMinimized(false)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={toggleOpen} className="fixed bottom-4 right-4 rounded-full p-3 h-12 w-12">
        <Bot className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card
      className={`fixed bottom-4 right-4 w-80 shadow-lg transition-all duration-300 ${isMinimized ? "h-14" : "h-96"}`}
    >
      <CardHeader className="p-3 flex flex-row items-center justify-between space-y-0 border-b">
        <CardTitle className="text-sm font-medium flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          BOB AI Assistant
        </CardTitle>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleMinimize}>
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleOpen}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100%-70px)] p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex items-start gap-2 max-w-[80%] ${message.sender === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {message.sender === "bot" && (
                        <Avatar className="h-8 w-8">
                          <Bot className="h-5 w-5" />
                        </Avatar>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-3 pt-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex w-full items-center space-x-2"
            >
              <Input
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" className="h-8 w-8">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </>
      )}
    </Card>
  )
}

