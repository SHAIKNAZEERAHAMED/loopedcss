import { generateText } from "@/lib/ai"
import { openai } from "@ai-sdk/openai"

// Types for content moderation
export type ContentType = "text" | "image" | "video" | "audio"
export type ModerationCategory =
  | "hate"
  | "harassment"
  | "sexual"
  | "violence"
  | "self-harm"
  | "misinformation"
  | "spam"
  | "clean"
export type ModerationAction = "allow" | "warn" | "suspend" | "ban"

export type ModerationResult = {
  isViolation: boolean
  categories: ModerationCategory[]
  primaryCategory: ModerationCategory
  confidence: number
  recommendedAction: ModerationAction
  explanation: string
  contentType: ContentType
  language: string
}

// User violation history (in production, this would be in a database)
type UserViolationRecord = {
  userId: string
  violations: {
    timestamp: number
    category: ModerationCategory
    action: ModerationAction
  }[]
}

const userViolationHistory: Record<string, UserViolationRecord> = {}

/**
 * Moderates content using a multi-stage AI approach
 * Supports text, image, video, and audio content
 * @param content The content to moderate
 * @param contentType The type of content
 * @param userId The ID of the user who created the content
 * @returns A ModerationResult object with detailed moderation information
 */
export async function moderateContent(
  content: string,
  contentType: ContentType,
  userId: string,
): Promise<ModerationResult> {
  try {
    // Get user violation history
    const userHistory = getUserViolationHistory(userId)
    const recentViolations = countRecentViolations(userHistory)

    // Detect language for text content
    let language = "unknown"
    if (contentType === "text") {
      language = await detectLanguage(content)
    }

    // Use content-type specific prompt
    let promptBase = "You are an expert content moderator. "

    switch (contentType) {
      case "text":
        promptBase += `Analyze this ${language} text for policy violations:`
        break
      case "image":
        promptBase += "Analyze this image description for policy violations:"
        break
      case "video":
        promptBase += "Analyze this video description for policy violations:"
        break
      case "audio":
        promptBase += "Analyze this audio transcription for policy violations:"
        break
    }

    const prompt = `${promptBase}
    
"${content}"

User has ${recentViolations} recent violations.

Provide a JSON response with these fields:
- isViolation: Boolean indicating if this violates platform policies
- categories: Array of violation categories ('hate', 'harassment', 'sexual', 'violence', 'self-harm', 'misinformation', 'spam', 'clean')
- primaryCategory: The main violation category
- confidence: Your confidence in this analysis (0-1)
- recommendedAction: One of 'allow', 'warn', 'suspend', 'ban'
- explanation: Brief explanation of your decision

Format your response as valid JSON only.`

    // Use AI SDK to get moderation analysis
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.1,
      maxTokens: 500,
    })

    // Parse the response
    const result = JSON.parse(text)

    // Adjust recommended action based on user history
    const adjustedAction = adjustActionBasedOnHistory(
      result.recommendedAction,
      recentViolations,
      result.primaryCategory,
    )

    // Record violation if applicable
    if (result.isViolation) {
      recordViolation(userId, result.primaryCategory, adjustedAction)
    }

    return {
      isViolation: result.isViolation,
      categories: result.categories,
      primaryCategory: result.primaryCategory,
      confidence: result.confidence,
      recommendedAction: adjustedAction,
      explanation: result.explanation,
      contentType: contentType,
      language: language,
    }
  } catch (error) {
    console.error("Error moderating content:", error)
    // Fallback to safe result
    return {
      isViolation: false,
      categories: ["clean"],
      primaryCategory: "clean",
      confidence: 0.5,
      recommendedAction: "allow",
      explanation: "Error analyzing content. Defaulting to safe classification.",
      contentType: contentType,
      language: "unknown",
    }
  }
}

/**
 * Detects the language of the provided text
 * @param text The text to analyze
 * @returns The detected language (english, telugu, telugu-english, or unknown)
 */
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
    return "unknown"
  }
}

/**
 * Gets a user's violation history
 * @param userId The user ID
 * @returns The user's violation record
 */
function getUserViolationHistory(userId: string): UserViolationRecord {
  if (!userViolationHistory[userId]) {
    userViolationHistory[userId] = {
      userId,
      violations: [],
    }
  }
  return userViolationHistory[userId]
}

/**
 * Counts recent violations (last 30 days)
 * @param record The user's violation record
 * @returns The number of recent violations
 */
function countRecentViolations(record: UserViolationRecord): number {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  return record.violations.filter((v) => v.timestamp >= thirtyDaysAgo).length
}

/**
 * Adjusts the recommended action based on user history
 * @param initialAction The initially recommended action
 * @param recentViolations The number of recent violations
 * @param category The violation category
 * @returns The adjusted action
 */
function adjustActionBasedOnHistory(
  initialAction: ModerationAction,
  recentViolations: number,
  category: ModerationCategory,
): ModerationAction {
  // Severe violations always result in stronger actions
  if (category === "hate" || category === "violence" || category === "self-harm") {
    if (initialAction === "allow") return "warn"
    if (initialAction === "warn") return "suspend"
  }

  // Escalate based on recent violations
  if (recentViolations >= 5) {
    if (initialAction === "warn") return "suspend"
    if (initialAction === "suspend") return "ban"
  } else if (recentViolations >= 3) {
    if (initialAction === "allow") return "warn"
  }

  return initialAction
}

/**
 * Records a violation for a user
 * @param userId The user ID
 * @param category The violation category
 * @param action The action taken
 */
function recordViolation(userId: string, category: ModerationCategory, action: ModerationAction): void {
  const record = getUserViolationHistory(userId)
  record.violations.push({
    timestamp: Date.now(),
    category,
    action,
  })
}

/**
 * Calculates the accuracy of content moderation
 * @param predictions Array of predicted results (isViolation boolean)
 * @param groundTruth Array of actual results (isViolation boolean)
 * @returns Accuracy as a percentage
 */
export function calculateModerationAccuracy(predictions: boolean[], groundTruth: boolean[]): number {
  if (predictions.length !== groundTruth.length || predictions.length === 0) {
    return 0
  }

  let correct = 0
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] === groundTruth[i]) {
      correct++
    }
  }

  return (correct / predictions.length) * 100
}

/**
 * Provides an explanation for a moderation decision using LlamaIndex-like approach
 * @param content The content that was moderated
 * @param result The moderation result
 * @returns A detailed explanation
 */
export async function explainModerationDecision(content: string, result: ModerationResult): Promise<string> {
  try {
    const prompt = `You are an AI content moderator explaining your decision to a user.
    
Content: "${content}"

Your decision: ${result.isViolation ? "Violation detected" : "No violation detected"}
Category: ${result.primaryCategory}
Action: ${result.recommendedAction}

Provide a detailed, educational explanation of why this decision was made. Be specific about which parts of the content triggered the decision, and explain the relevant platform policy. Keep your explanation under 150 words.`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 300,
    })

    return text
  } catch (error) {
    console.error("Error explaining moderation decision:", error)
    return "We couldn't generate a detailed explanation at this time, but our AI system has flagged this content based on our community guidelines."
  }
}

