"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { generateText } from "@/lib/ai"
import { openai } from "@ai-sdk/openai"

interface AIResponseProps {
  postContent: string
}

export function AIResponse({ postContent }: AIResponseProps) {
  const [response, setResponse] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState<string>("english")

  useEffect(() => {
    async function generateResponse() {
      try {
        setLoading(true)

        // First detect language
        const detectedLanguage = await detectLanguage(postContent)
        setLanguage(detectedLanguage)

        // Generate response based on language
        const aiResponse = await getAIResponse(postContent, detectedLanguage)
        setResponse(aiResponse)
      } catch (error) {
        console.error("Error generating AI response:", error)
        setResponse("Sorry, I couldn't generate a response at this time.")
      } finally {
        setLoading(false)
      }
    }

    generateResponse()
  }, [postContent])

  async function detectLanguage(text: string): Promise<string> {
    try {
      const { text: result } = await generateText({
        model: openai("gpt-4o"),
        prompt: `Identify the language of this text: "${text}". 
        If it's Telugu, respond with "telugu". 
        If it's English, respond with "english". 
        If it's a mix of Telugu and English, respond with "telugu-english".
        Respond with only one word.`,
        temperature: 0.1,
        maxTokens: 10,
      })

      return result.toLowerCase().trim()
    } catch (error) {
      console.error("Error detecting language:", error)
      return "english"
    }
  }

  async function getAIResponse(content: string, language: string): Promise<string> {
    let prompt = ""

    if (language === "telugu" || language === "telugu-english") {
      prompt = `You are BOB, a friendly AI assistant for a social media platform. 
      Respond to this post in a mix of Telugu and English (Tenglish) with a friendly, supportive tone.
      Use Telugu greetings and expressions where appropriate.
      Keep your response brief (2-3 sentences).
      
      Post: "${content}"
      
      Your response in Telugu-English mix:`
    } else {
      prompt = `You are BOB, a friendly AI assistant for a social media platform. 
      Respond to this post in English with a friendly, supportive tone.
      Keep your response brief (2-3 sentences).
      
      Post: "${content}"
      
      Your response:`
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 150,
    })

    return text
  }

  return (
    <Card className="mt-4 bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg?height=32&width=32" alt="BOB" />
            <AvatarFallback>BOB</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">BOB AI</span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {language === "telugu" ? "Telugu" : language === "telugu-english" ? "Tenglish" : "English"}
              </span>
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-sm">{response}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

