// Enhanced sentiment analysis service with Telugu support

import OpenAI from "openai"
import { db } from "./firebase/config"

export interface SentimentResult {
  score: number
  label: "positive" | "negative" | "neutral"
  confidence: number
}

// Function to detect language
function detectLanguage(text: string): "english" | "telugu" | "other" {
  // Telugu Unicode range: 0C00-0C7F
  const teluguPattern = /[\u0C00-\u0C7F]/

  if (teluguPattern.test(text)) {
    return "telugu"
  }

  // Default to English for Latin script
  return "english"
}

/**
 * Simple sentiment analysis utility that doesn't rely on external APIs
 */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    })

    const response = await openai.completions.create({
      model: "text-davinci-003",
      prompt: `Analyze the sentiment of this text and return a score between -1 and 1, where -1 is very negative and 1 is very positive:\n\n"${text}"`,
      max_tokens: 60,
      temperature: 0.3,
    })

    const score = parseFloat(response.choices[0].text?.trim() || "0")
    
    let label: SentimentResult["label"]
    if (score > 0.2) label = "positive"
    else if (score < -0.2) label = "negative"
    else label = "neutral"

    const result: SentimentResult = {
      score,
      label,
      confidence: Math.abs(score)
    }

    // Log the sentiment analysis result
    await logSentimentAnalysis(text, result)

    return result
  } catch (error) {
    console.error("Error analyzing sentiment:", error)
    return {
      score: 0,
      label: "neutral",
      confidence: 0
    }
  }
}

async function logSentimentAnalysis(text: string, result: SentimentResult) {
  try {
    const { ref, push, serverTimestamp } = await import("firebase/database")
    const { set } = await import("firebase/database")

    const moderationRef = ref(db, "moderation")
    const newLogRef = push(moderationRef)

    await set(newLogRef, {
      type: "sentiment",
      text,
      result,
      timestamp: serverTimestamp()
    })
  } catch (error) {
    console.error("Error logging sentiment analysis:", error)
  }
}

function analyzeEnglishSentiment(text: string): SentimentResult {
  // Simple keyword-based sentiment analysis for English
  const positiveWords = [
    "happy",
    "good",
    "great",
    "excellent",
    "wonderful",
    "amazing",
    "love",
    "like",
    "best",
    "fantastic",
    "awesome",
    "beautiful",
    "joy",
    "excited",
    "perfect",
  ]

  const negativeWords = [
    "sad",
    "bad",
    "terrible",
    "awful",
    "horrible",
    "hate",
    "dislike",
    "worst",
    "poor",
    "disappointing",
    "ugly",
    "angry",
    "mad",
    "upset",
    "annoying",
  ]

  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase()

  // Count positive and negative words
  let positiveCount = 0
  let negativeCount = 0

  positiveWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "g")
    const matches = lowerText.match(regex)
    if (matches) {
      positiveCount += matches.length
    }
  })

  negativeWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "g")
    const matches = lowerText.match(regex)
    if (matches) {
      negativeCount += matches.length
    }
  })

  // Calculate sentiment score (-1 to 1)
  const totalWords = positiveCount + negativeCount
  let score = 0

  if (totalWords > 0) {
    score = (positiveCount - negativeCount) / totalWords
  }

  // Determine sentiment label
  let label: "positive" | "neutral" | "negative" = "neutral"
  let confidence = Math.min(Math.abs(score) + 0.5, 1)

  if (score > 0.2) {
    label = "positive"
  } else if (score < -0.2) {
    label = "negative"
  }

  return {
    score,
    label,
    confidence,
  }
}

function analyzeTeluguSentiment(text: string): SentimentResult {
  // Simple keyword-based sentiment analysis for Telugu
  // These are just examples - in a real app, you'd have a more comprehensive list
  const positiveWords = ["బాగుంది", "చాలా బాగుంది", "అద్భుతం", "ప్రేమ", "సంతోషం", "ఆనందం", "మంచి", "అందమైన", "గొప్ప", "సహాయం"]

  const negativeWords = ["చెడ్డ", "బాధ", "దుఃఖం", "కోపం", "అసహ్యం", "చెత్త", "నిరాశ", "భయం", "అసంతృప్తి", "నష్టం"]

  // Count positive and negative words
  let positiveCount = 0
  let negativeCount = 0

  positiveWords.forEach((word) => {
    if (text.includes(word)) {
      positiveCount += 1
    }
  })

  negativeWords.forEach((word) => {
    if (text.includes(word)) {
      negativeCount += 1
    }
  })

  // Calculate sentiment score (-1 to 1)
  const totalWords = positiveCount + negativeCount
  let score = 0

  if (totalWords > 0) {
    score = (positiveCount - negativeCount) / totalWords
  }

  // Determine sentiment label
  let label: "positive" | "neutral" | "negative" = "neutral"
  let confidence = Math.min(Math.abs(score) + 0.5, 1)

  if (score > 0.2) {
    label = "positive"
  } else if (score < -0.2) {
    label = "negative"
  }

  return {
    score,
    label,
    confidence,
  }
}

// Function to check for abusive content in both English and Telugu
export async function detectAbusiveContent(text: string): Promise<{
  isAbusive: boolean
  confidence: number
  category?: string
  language: string
}> {
  // Detect language
  const language = detectLanguage(text)

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Abusive words lists
  const englishAbusiveWords = [
    "hate",
    "kill",
    "attack",
    "stupid",
    "idiot",
    "dumb",
    "ugly",
    "racist",
    "sexist",
    "violent",
    "threat",
    "abuse",
  ]

  const teluguAbusiveWords = ["దుర్భాషలాడు", "తిట్టు", "బెదిరింపు", "హింస", "ద్వేషం", "వేధింపు", "అవమానం", "అసభ్యకరమైన"]

  // Select appropriate word list based on language
  const abusiveWords = language === "telugu" ? teluguAbusiveWords : englishAbusiveWords

  // Check for abusive words
  let abusiveCount = 0
  let detectedCategory = ""

  if (language === "telugu") {
    // For Telugu, simple inclusion check
    for (const word of abusiveWords) {
      if (text.includes(word)) {
        abusiveCount += 1
        if (!detectedCategory) {
          detectedCategory = word
        }
      }
    }
  } else {
    // For English, word boundary check
    const lowerText = text.toLowerCase()
    for (const word of abusiveWords) {
      const regex = new RegExp(`\\b${word}\\b`, "g")
      const matches = lowerText.match(regex)
      if (matches) {
        abusiveCount += matches.length
        if (!detectedCategory) {
          detectedCategory = word
        }
      }
    }
  }

  // Determine if content is abusive
  const isAbusive = abusiveCount > 0

  // Calculate confidence (simplified)
  const confidence = Math.min(abusiveCount * 0.2 + 0.6, 1)

  return {
    isAbusive,
    confidence,
    category: isAbusive ? detectedCategory : undefined,
    language: language,
  }
}

// Log moderation events to the database
export async function logModerationEvent(
  postId: string,
  userId: string,
  content: string,
  result: {
    isAbusive: boolean
    confidence: number
    category?: string
    language: string
  },
): Promise<void> {
  try {
    const { ref, push, serverTimestamp, set } = await import("firebase/database")
    const moderationRef = ref(db, "moderation")
    const newLogRef = push(moderationRef)

    await set(newLogRef, {
      postId,
      userId,
      content,
      result,
      timestamp: serverTimestamp(),
    })

    console.log("Moderation event logged successfully")
  } catch (error) {
    console.error("Error logging moderation event:", error)
  }
}

