import { ref, push, set, serverTimestamp } from "firebase/database"
import { db } from "./firebase/config"

export interface ModerationResult {
  isSafe: boolean
  warning?: string
  confidence?: number
  categories?: string[]
}

// Comprehensive list of inappropriate content categories
const profanityWords = new Set([
  "fuck", "shit", "damn", "bitch", "ass", "dick", "pussy", "cock", "cunt", "whore",
  // Add more profanity words as needed
])

const hateWords = new Set([
  "hate", "kill", "die", "attack", "murder", "slaughter", "destroy",
  // Add more hate speech words as needed
])

const discriminatoryWords = new Set([
  "racist", "sexist", "homophobic", "transphobic", "bigot",
  // Add more discriminatory words as needed
])

export async function moderateContent(content: string): Promise<ModerationResult> {
  const contentLower = content.toLowerCase()
  const words = contentLower.split(/\s+/)
  const detectedCategories: string[] = []
  
  // Check for profanity
  const hasProfanity = words.some(word => profanityWords.has(word))
  if (hasProfanity) {
    detectedCategories.push("profanity")
  }

  // Check for hate speech
  const hasHateSpeech = words.some(word => hateWords.has(word))
  if (hasHateSpeech) {
    detectedCategories.push("hate_speech")
  }

  // Check for discriminatory content
  const hasDiscriminatory = words.some(word => discriminatoryWords.has(word))
  if (hasDiscriminatory) {
    detectedCategories.push("discriminatory")
  }

  // Check for all caps (shouting)
  const capsWords = content.split(/\s+/).filter(word => word.length > 3 && word === word.toUpperCase())
  if (capsWords.length > words.length / 2) {
    detectedCategories.push("excessive_caps")
  }

  // Check for excessive punctuation
  const excessivePunctuation = /[!?]{3,}/.test(content)
  if (excessivePunctuation) {
    detectedCategories.push("excessive_punctuation")
  }

  // Check for spam-like content
  const hasRepeatedWords = words.length > 5 && new Set(words).size < words.length / 2
  if (hasRepeatedWords) {
    detectedCategories.push("spam")
  }

  // Check for suspicious URLs
  const hasUrls = /https?:\/\/(?!loopcss\.com)[^\s]+/i.test(content)
  if (hasUrls) {
    detectedCategories.push("external_urls")
  }

  if (detectedCategories.length > 0) {
    let warning = "Your content contains inappropriate or suspicious elements:"
    const categoryMessages: { [key: string]: string } = {
      profanity: "inappropriate language",
      hate_speech: "hostile or aggressive content",
      discriminatory: "discriminatory content",
      excessive_caps: "excessive use of capital letters",
      excessive_punctuation: "excessive punctuation",
      spam: "repetitive or spam-like content",
      external_urls: "suspicious external links",
    }

    warning += " " + detectedCategories
      .map(cat => categoryMessages[cat])
      .filter(Boolean)
      .join(", ")

    return {
      isSafe: false,
      warning,
      confidence: 0.9,
      categories: detectedCategories
    }
  }

  return {
    isSafe: true,
    confidence: 1,
    categories: []
  }
}

export async function shouldShowContent(content: string): Promise<boolean> {
  const result = await moderateContent(content)
  return result.isSafe
}

export async function getContentWarning(content: string): Promise<string | null> {
  const result = await moderateContent(content)
  return result.isSafe ? null : result.warning || "This content may be inappropriate"
}

export async function detectAbusiveContent(content: string): Promise<boolean> {
  const result = await moderateContent(content)
  return !result.isSafe
}

// Log moderation events to the database
export async function logModerationEvent(
  postId: string,
  userId: string,
  content: string,
  result: ModerationResult,
): Promise<void> {
  try {
    const moderationRef = ref(db, "moderation-logs")
    const newLogRef = push(moderationRef)

    await set(newLogRef, {
      postId,
      userId,
      content,
      result,
      timestamp: serverTimestamp(),
      reviewed: false,
      actionTaken: false,
    })

    console.log("Moderation event logged successfully")
  } catch (error) {
    console.error("Error logging moderation event:", error)
  }
}

