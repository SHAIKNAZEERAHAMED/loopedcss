import { ref, push, set, serverTimestamp, get } from "firebase/database"
import { db } from "./firebase/config"

export interface ModerationResult {
  isSafe: boolean
  warning?: string
  confidence: number
  categories: string[]
  safetyScore: number
}

export interface SafetyMetrics {
  totalPosts: number
  flaggedPosts: number
  safetyScore: number
  categories: Record<string, number>
  trend: number[]
}

// Enhanced list of inappropriate content categories with weighted scores
const contentCategories = {
  profanity: {
    words: new Set([
      "fuck", "shit", "damn", "bitch", "ass", "dick", "pussy", "cock", "cunt", "whore",
      "fuk", "f*ck", "f**k", "fu*k", "fck", "sh*t", "sh!t", "b!tch", "b*tch",
      "a$$", "a**", "d!ck", "d*ck", "p*ssy", "c*ck", "c*nt",
      // Common variations and misspellings
      "fuk", "fuq", "fck", "phuck", "phuk", "fvck", "biotch", "biatch", "azzhole",
      // Add more profanity variations
    ]),
    weight: 1.0  // Increased weight for profanity
  },
  hate_speech: {
    words: new Set([
      "hate", "racist", "bigot", "discrimination", "nazi", "supremacist",
      // Expanded hate speech terms
      "xenophob", "antisemit", "homophob", "transphob", "islamophob",
      "supremacy", "genocide", "ethnic cleansing",
      // Add more hate speech terms
    ]),
    weight: 1.0
  },
  violence: {
    words: new Set([
      "kill", "attack", "fight", "hurt", "murder", "slaughter", "destroy",
      // Expanded violence terms
      "assassinate", "massacre", "torture", "brutalize", "execute",
      "bloodshed", "terrorize", "annihilate",
      // Add more violent terms
    ]),
    weight: 0.9
  },
  harassment: {
    words: new Set([
      "bully", "harass", "threaten", "stalk", "troll",
      // Expanded harassment terms
      "intimidate", "torment", "persecute", "victimize", "abuse",
      "humiliate", "degrade", "shame",
      // Add more harassment terms
    ]),
    weight: 0.8
  },
  adult: {
    words: new Set([
      "nsfw", "explicit", "xxx", "porn",
      // Expanded adult content terms
      "pornographic", "obscene", "lewd", "sexual", "erotic",
      "nudity", "naked", "adult content",
      // Add more adult content terms
    ]),
    weight: 0.7
  }
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Remove common character substitutions
    .replace(/[0@4]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[8]/g, 'b')
    .replace(/[0]/g, 'o')
    // Remove special characters
    .replace(/[^\w\s]/g, '')
    // Remove repeated characters
    .replace(/(.)\1+/g, '$1')
    // Remove spaces
    .replace(/\s+/g, '')
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  const contentLower = text.toLowerCase()
  const normalizedContent = normalizeText(text)
  const detectedCategories: string[] = []
  let totalScore = 0
  let maxWeight = 0

  // Check each category against both original and normalized text
  for (const [category, config] of Object.entries(contentCategories)) {
    // Check original text
    const originalMatches = Array.from(config.words).filter(word => 
      contentLower.includes(word) || normalizedContent.includes(normalizeText(word))
    )
    
    if (originalMatches.length > 0) {
      detectedCategories.push(category)
      totalScore += originalMatches.length * config.weight
      maxWeight = Math.max(maxWeight, config.weight)
    }
  }

  // Calculate safety score (0-100, higher is safer)
  const safetyScore = Math.max(0, Math.min(100, 100 - (totalScore * 25)))  // Increased penalty
  
  // Stricter safety thresholds
  const isSafe = safetyScore >= 85 && maxWeight < 0.7  // Increased threshold

  // Enhanced warning message
  let warning: string | undefined
  if (!isSafe) {
    warning = detectedCategories.length > 0
      ? `Content contains inappropriate material (${detectedCategories.join(", ")}). Please revise your post to meet community guidelines.`
      : "This content may be inappropriate. Please review our community guidelines."
  }

  return {
    isSafe,
    warning,
    confidence: maxWeight > 0 ? maxWeight : 1,
    categories: detectedCategories,
    safetyScore
  }
}

export async function logModerationEvent(
  postId: string,
  userId: string,
  content: string,
  result: ModerationResult,
): Promise<void> {
  try {
    // Log the moderation event
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

    // Update safety metrics
    const metricsRef = ref(db, `safety-metrics/${userId}`)
    const snapshot = await get(metricsRef)
    const currentMetrics = snapshot.val() || {
      totalPosts: 0,
      flaggedPosts: 0,
      safetyScore: 100,
      categories: {},
      trend: []
    }

    // Update metrics
    currentMetrics.totalPosts++
    if (!result.isSafe) {
      currentMetrics.flaggedPosts++
      result.categories.forEach(category => {
        currentMetrics.categories[category] = (currentMetrics.categories[category] || 0) + 1
      })
    }

    // Calculate new safety score
    currentMetrics.safetyScore = Math.round(
      (currentMetrics.totalPosts - currentMetrics.flaggedPosts) / currentMetrics.totalPosts * 100
    )

    // Keep track of trend (last 30 days)
    currentMetrics.trend.push(result.safetyScore)
    if (currentMetrics.trend.length > 30) {
      currentMetrics.trend.shift()
    }

    await set(metricsRef, currentMetrics)
  } catch (error) {
    console.error("Error logging moderation event:", error)
  }
}

export async function getUserSafetyMetrics(userId: string): Promise<SafetyMetrics> {
  const metricsRef = ref(db, `safety-metrics/${userId}`)
  const snapshot = await get(metricsRef)
  return snapshot.val() || {
    totalPosts: 0,
    flaggedPosts: 0,
    safetyScore: 100,
    categories: {},
    trend: []
  }
}

export async function shouldShowContent(content: string): Promise<boolean> {
  const result = await moderateContent(content)
  return result.isSafe
}

export async function getContentWarning(content: string): Promise<string | null> {
  const result = await moderateContent(content)
  return result.isSafe ? null : result.warning || "Content may be inappropriate"
}

export async function detectAbusiveContent(content: string): Promise<boolean> {
  const result = await moderateContent(content)
  return !result.isSafe
}


