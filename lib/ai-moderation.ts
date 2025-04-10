import { getDatabase, ref, get, update } from "firebase/database"

/**
 * Simple content moderation utility that doesn't rely on external APIs
 */
export async function moderateContent(content: string): Promise<{
  isSafe: boolean
  category?: string
  confidence?: number
}> {
  try {
    // Only use OpenAI if API key is available
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      // Fallback to local basic moderation
      return localModeration(content)
    }

    // This would be the implementation with OpenAI API
    // For now, we're using local moderation
    return localModeration(content)
  } catch (error) {
    console.error("Error in content moderation:", error)
    // Fail safe - if there's an error, treat content as safe
    return { isSafe: true }
  }
}

/**
 * Basic local moderation without external API
 */
function localModeration(content: string): {
  isSafe: boolean
  category?: string
  confidence?: number
} {
  // Convert to lowercase for case-insensitive matching
  const lowerContent = content.toLowerCase()

  // Define different categories of harmful content with associated words
  const categories = {
    hate: ["hate", "racist", "bigot", "sexist", "prejudice"],
    threatening: ["kill", "attack", "threat", "murder", "bomb"],
    harassment: ["harass", "bully", "stalking", "intimidate"],
    selfHarm: ["suicide", "self-harm", "cut myself", "kill myself"],
    sexual: ["explicit", "pornography", "nsfw", "obscene"],
    violence: ["violent", "bloodshed", "gore", "graphic"],
  }

  // Check each category
  for (const [category, words] of Object.entries(categories)) {
    const matches = words.filter((word) => lowerContent.includes(word))

    if (matches.length > 0) {
      // Calculate a "confidence" value based on number of matches and content length
      const confidence = Math.min(0.9, 0.5 + (matches.length / words.length) * 0.4)

      return {
        isSafe: false,
        category,
        confidence,
      }
    }
  }

  return { isSafe: true }
}

interface ContentHistoryItem {
  content: string
  moderationResult: {
    isSafe: boolean
    category?: string
    confidence?: number
  }
}

/**
 * Calculate a safety score based on content history
 */
export async function calculateSafetyScore(contentHistory: ContentHistoryItem[]): Promise<{
  score: number
  level: "green" | "yellow" | "red"
}> {
  if (!contentHistory.length) {
    return { score: 100, level: "green" }
  }

  // Calculate base score
  let totalScore = 100
  let weightedViolations = 0
  const violations = new Set<string>()

  contentHistory.forEach((item) => {
    if (!item.moderationResult.isSafe) {
      // Each unique violation category reduces score
      if (item.moderationResult.category && !violations.has(item.moderationResult.category)) {
        violations.add(item.moderationResult.category)
        totalScore -= 15 // Penalty for each unique violation type
      }

      // Weight by confidence
      const confidence = item.moderationResult.confidence || 0.5
      weightedViolations += confidence
    }
  })

  // Reduce score based on number of violations
  totalScore -= Math.min(50, weightedViolations * 10)

  // Ensure score stays within 0-100
  totalScore = Math.max(0, Math.min(100, totalScore))

  // Determine safety level
  let level: "green" | "yellow" | "red"
  if (totalScore >= 80) {
    level = "green"
  } else if (totalScore >= 50) {
    level = "yellow"
  } else {
    level = "red"
  }

  return {
    score: totalScore,
    level,
  }
}

interface ModerationLog {
  id: string
  content: string
  timestamp: number
  result: {
    isSafe: boolean
    category?: string
    confidence?: number
  }
  userId?: string
  action?: string
}

export async function getModerationLogs(): Promise<ModerationLog[]> {
  try {
    const db = getDatabase()
    const logsRef = ref(db, 'moderationLogs')
    const snapshot = await get(logsRef)
    return snapshot.val() || []
  } catch (error) {
    console.error('Error getting moderation logs:', error)
    return []
  }
}

export async function updateModerationLog(logId: string, updates: Partial<ModerationLog>): Promise<void> {
  try {
    const db = getDatabase()
    const logRef = ref(db, `moderationLogs/${logId}`)
    await update(logRef, updates)
  } catch (error) {
    console.error('Error updating moderation log:', error)
    throw error
  }
}

