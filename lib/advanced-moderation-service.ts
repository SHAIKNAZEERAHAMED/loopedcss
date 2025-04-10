import { ref, set, get, push, serverTimestamp } from "firebase/database"
import { db } from "./firebase/config"
import { generateText } from "@/lib/ai"
import { openai } from "@ai-sdk/openai"

// Content types that can be moderated
export type ContentType = "text" | "image" | "video" | "audio"

// Moderation severity levels
export enum ModerationSeverity {
  NONE = "none",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Content categories for moderation
export enum ContentCategory {
  SAFE = "safe",
  HARASSMENT = "harassment",
  HATE_SPEECH = "hate_speech",
  SELF_HARM = "self_harm",
  SEXUAL = "sexual",
  VIOLENCE = "violence",
  GAMBLING = "gambling",
  UNAUTHORIZED_PROMOTION = "unauthorized_promotion",
  SPAM = "spam",
  MISINFORMATION = "misinformation",
  SARCASM = "sarcasm", // Not harmful but detected for context
  ROASTING = "roasting", // Not harmful but detected for context
}

// Moderation result interface
export interface ModerationResult {
  id: string
  timestamp: number
  contentType: ContentType
  contentId: string
  userId: string
  isApproved: boolean
  severity: ModerationSeverity
  categories: ContentCategory[]
  confidence: number
  contextAware: boolean
  moderationModel: string
  moderationNotes?: string
  appealable: boolean
}

/**
 * Moderates text content using advanced NLP models
 */
export async function moderateText(text: string, userId: string, contentId: string): Promise<ModerationResult> {
  try {
    // Generate a unique ID for this moderation result
    const moderationId = push(ref(db, "moderation")).key as string

    // Use OpenAI to analyze the text with context awareness
    const { text: analysisResult } = await generateText({
      model: openai("gpt-4o"),
      system: `
        You are an advanced content moderation system. Analyze the provided text and return a JSON object with the following structure:
        {
          "isApproved": boolean,
          "severity": "none" | "low" | "medium" | "high" | "critical",
          "categories": string[], // Array of detected categories
          "confidence": number, // 0-1 value
          "contextAware": boolean,
          "moderationNotes": string,
          "isSarcasm": boolean,
          "isRoasting": boolean,
          "isHarmfulRoasting": boolean
        }
        
        Guidelines:
        - Distinguish between harmful content and friendly roasting/sarcasm
        - Consider cultural context and common expressions
        - "Roasting" that is friendly banter should be approved
        - Detect unauthorized promotions for gambling or betting apps
        - Flag misinformation about serious topics
        - Detect subtle harassment or bullying
      `,
      prompt: `Analyze this text for moderation: "${text}"`,
      temperature: 0.1,
      max_tokens: 500,
    })

    // Parse the analysis result
    let parsedResult
    try {
      // Extract JSON from the response if needed
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : analysisResult
      parsedResult = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("Error parsing moderation result:", parseError)
      // Fallback to basic moderation
      parsedResult = {
        isApproved: !containsBasicProhibitedContent(text),
        severity: containsBasicProhibitedContent(text) ? ModerationSeverity.MEDIUM : ModerationSeverity.NONE,
        categories: containsBasicProhibitedContent(text) ? [ContentCategory.HARASSMENT] : [ContentCategory.SAFE],
        confidence: 0.7,
        contextAware: false,
        moderationNotes: "Fallback moderation due to parsing error",
        isSarcasm: false,
        isRoasting: false,
        isHarmfulRoasting: false,
      }
    }

    // Map categories from the result
    const categories: ContentCategory[] = []
    if (parsedResult.categories && Array.isArray(parsedResult.categories)) {
      parsedResult.categories.forEach((category: string) => {
        const normalizedCategory = category.toLowerCase().replace(/\s/g, "_")
        if (Object.values(ContentCategory).includes(normalizedCategory as ContentCategory)) {
          categories.push(normalizedCategory as ContentCategory)
        }
      })
    }

    // Add sarcasm and roasting categories if detected
    if (parsedResult.isSarcasm) {
      categories.push(ContentCategory.SARCASM)
    }

    if (parsedResult.isRoasting && !parsedResult.isHarmfulRoasting) {
      categories.push(ContentCategory.ROASTING)
    }

    // If no categories were successfully mapped, add a default
    if (categories.length === 0) {
      categories.push(parsedResult.isApproved ? ContentCategory.SAFE : ContentCategory.HARASSMENT)
    }

    // Create the moderation result
    const moderationResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "text",
      contentId,
      userId,
      isApproved: parsedResult.isApproved,
      severity: parsedResult.severity || ModerationSeverity.NONE,
      categories,
      confidence: parsedResult.confidence || 0.8,
      contextAware: parsedResult.contextAware || true,
      moderationModel: "gpt-4o",
      moderationNotes: parsedResult.moderationNotes || "",
      appealable: parsedResult.severity !== ModerationSeverity.CRITICAL,
    }

    // Store the moderation result
    await set(ref(db, `moderation/${moderationId}`), moderationResult)

    // Update the content status based on moderation
    await set(ref(db, `content/${contentId}/moderationStatus`), {
      isApproved: moderationResult.isApproved,
      moderationId,
      timestamp: serverTimestamp(),
    })

    return moderationResult
  } catch (error) {
    console.error("Error moderating text:", error)

    // Fallback to basic moderation in case of error
    const moderationId = push(ref(db, "moderation")).key as string
    const isApproved = !containsBasicProhibitedContent(text)

    const fallbackResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "text",
      contentId,
      userId,
      isApproved,
      severity: isApproved ? ModerationSeverity.NONE : ModerationSeverity.MEDIUM,
      categories: isApproved ? [ContentCategory.SAFE] : [ContentCategory.HARASSMENT],
      confidence: 0.6,
      contextAware: false,
      moderationModel: "fallback-rule-based",
      moderationNotes: "Fallback moderation due to service error",
      appealable: true,
    }

    // Store the fallback result
    await set(ref(db, `moderation/${moderationId}`), fallbackResult)

    // Update the content status
    await set(ref(db, `content/${contentId}/moderationStatus`), {
      isApproved: fallbackResult.isApproved,
      moderationId,
      timestamp: serverTimestamp(),
    })

    return fallbackResult
  }
}

/**
 * Moderates image content using AI vision models
 */
export async function moderateImage(imageUrl: string, userId: string, contentId: string): Promise<ModerationResult> {
  try {
    // Generate a unique ID for this moderation result
    const moderationId = push(ref(db, "moderation")).key as string

    // Use OpenAI to analyze the image
    const { text: analysisResult } = await generateText({
      model: openai("gpt-4o"),
      system: `
        You are an advanced image moderation system. Analyze the provided image URL and return a JSON object with the following structure:
        {
          "isApproved": boolean,
          "severity": "none" | "low" | "medium" | "high" | "critical",
          "categories": string[], // Array of detected categories
          "confidence": number, // 0-1 value
          "moderationNotes": string,
          "containsNudity": boolean,
          "containsViolence": boolean,
          "containsUnauthorizedPromotion": boolean,
          "containsGambling": boolean,
          "detectedText": string // Any text detected in the image
        }
        
        Guidelines:
        - Check for nudity, explicit content, or suggestive imagery
        - Detect violence or graphic content
        - Identify unauthorized promotions or gambling content
        - Look for betting app promotions or logos
        - Extract and analyze any text in the image
      `,
      prompt: `Analyze this image for moderation: ${imageUrl}`,
      temperature: 0.1,
      max_tokens: 500,
    })

    // Parse the analysis result
    let parsedResult
    try {
      // Extract JSON from the response if needed
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : analysisResult
      parsedResult = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("Error parsing image moderation result:", parseError)
      // Fallback to basic approval
      parsedResult = {
        isApproved: true,
        severity: ModerationSeverity.NONE,
        categories: [ContentCategory.SAFE],
        confidence: 0.5,
        moderationNotes: "Fallback moderation due to parsing error",
        containsNudity: false,
        containsViolence: false,
        containsUnauthorizedPromotion: false,
        containsGambling: false,
        detectedText: "",
      }
    }

    // Map categories from the result
    const categories: ContentCategory[] = []

    // Add categories based on detected content
    if (parsedResult.containsNudity) {
      categories.push(ContentCategory.SEXUAL)
    }

    if (parsedResult.containsViolence) {
      categories.push(ContentCategory.VIOLENCE)
    }

    if (parsedResult.containsUnauthorizedPromotion) {
      categories.push(ContentCategory.UNAUTHORIZED_PROMOTION)
    }

    if (parsedResult.containsGambling) {
      categories.push(ContentCategory.GAMBLING)
    }

    // If no categories were detected, add safe category
    if (categories.length === 0) {
      categories.push(ContentCategory.SAFE)
    }

    // If detected text, moderate that as well
    if (parsedResult.detectedText && parsedResult.detectedText.length > 0) {
      const textModerationResult = await moderateText(parsedResult.detectedText, userId, `${contentId}_text`)

      // If text moderation found issues, add those categories and update approval
      if (!textModerationResult.isApproved) {
        textModerationResult.categories.forEach((category) => {
          if (!categories.includes(category)) {
            categories.push(category)
          }
        })

        parsedResult.isApproved = false
        parsedResult.severity = textModerationResult.severity
        parsedResult.moderationNotes = `${parsedResult.moderationNotes || ""} Text in image flagged: ${textModerationResult.moderationNotes}`
      }
    }

    // Create the moderation result
    const moderationResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "image",
      contentId,
      userId,
      isApproved: parsedResult.isApproved,
      severity: parsedResult.severity || ModerationSeverity.NONE,
      categories,
      confidence: parsedResult.confidence || 0.8,
      contextAware: true,
      moderationModel: "gpt-4o-vision",
      moderationNotes: parsedResult.moderationNotes || "",
      appealable: parsedResult.severity !== ModerationSeverity.CRITICAL,
    }

    // Store the moderation result
    await set(ref(db, `moderation/${moderationId}`), moderationResult)

    // Update the content status based on moderation
    await set(ref(db, `content/${contentId}/moderationStatus`), {
      isApproved: moderationResult.isApproved,
      moderationId,
      timestamp: serverTimestamp(),
    })

    return moderationResult
  } catch (error) {
    console.error("Error moderating image:", error)

    // Fallback to basic moderation in case of error
    const moderationId = push(ref(db, "moderation")).key as string

    const fallbackResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "image",
      contentId,
      userId,
      isApproved: true, // Default to approved for fallback
      severity: ModerationSeverity.NONE,
      categories: [ContentCategory.SAFE],
      confidence: 0.5,
      contextAware: false,
      moderationModel: "fallback-rule-based",
      moderationNotes: "Fallback moderation due to service error",
      appealable: true,
    }

    // Store the fallback result
    await set(ref(db, `moderation/${moderationId}`), fallbackResult)

    // Update the content status
    await set(ref(db, `content/${contentId}/moderationStatus`), {
      isApproved: fallbackResult.isApproved,
      moderationId,
      timestamp: serverTimestamp(),
    })

    return fallbackResult
  }
}

/**
 * Moderates video content using AI models
 */
export async function moderateVideo(
  videoUrl: string,
  thumbnailUrl: string,
  userId: string,
  contentId: string,
): Promise<ModerationResult> {
  try {
    // Generate a unique ID for this moderation result
    const moderationId = push(ref(db, "moderation")).key as string

    // First, moderate the thumbnail as an image
    const thumbnailModeration = await moderateImage(thumbnailUrl, userId, `${contentId}_thumbnail`)

    // If thumbnail is not approved, reject the video immediately
    if (!thumbnailModeration.isApproved) {
      const moderationResult: ModerationResult = {
        id: moderationId,
        timestamp: Date.now(),
        contentType: "video",
        contentId,
        userId,
        isApproved: false,
        severity: thumbnailModeration.severity,
        categories: thumbnailModeration.categories,
        confidence: thumbnailModeration.confidence,
        contextAware: true,
        moderationModel: "thumbnail-based",
        moderationNotes: `Video rejected based on thumbnail moderation: ${thumbnailModeration.moderationNotes}`,
        appealable: thumbnailModeration.appealable,
      }

      // Store the moderation result
      await set(ref(db, `moderation/${moderationId}`), moderationResult)

      // Update the content status
      await set(ref(db, `content/${contentId}/moderationStatus`), {
        isApproved: false,
        moderationId,
        timestamp: serverTimestamp(),
      })

      return moderationResult
    }

    // For video content, we would ideally use a video analysis API
    // For this implementation, we'll use OpenAI to analyze the video URL and thumbnail
    const { text: analysisResult } = await generateText({
      model: openai("gpt-4o"),
      system: `
        You are an advanced video moderation system. Analyze the provided video URL and thumbnail URL and return a JSON object with the following structure:
        {
          "isApproved": boolean,
          "severity": "none" | "low" | "medium" | "high" | "critical",
          "categories": string[], // Array of detected categories
          "confidence": number, // 0-1 value
          "moderationNotes": string,
          "requiresHumanReview": boolean
        }
        
        Guidelines:
        - For video content, be cautious and flag for human review if uncertain
        - Consider the thumbnail as a representation of the video content
        - Flag any potential violations for human review
        - Be especially vigilant for unauthorized promotions, gambling content, and betting apps
      `,
      prompt: `Analyze this video for moderation. Video URL: ${videoUrl}, Thumbnail URL: ${thumbnailUrl}`,
      temperature: 0.1,
      max_tokens: 500,
    })

    // Parse the analysis result
    let parsedResult
    try {
      // Extract JSON from the response if needed
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : analysisResult
      parsedResult = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("Error parsing video moderation result:", parseError)
      // Fallback to thumbnail-based decision
      parsedResult = {
        isApproved: thumbnailModeration.isApproved,
        severity: thumbnailModeration.severity,
        categories: thumbnailModeration.categories,
        confidence: 0.6,
        moderationNotes: "Based on thumbnail analysis only due to parsing error",
        requiresHumanReview: true,
      }
    }

    // Create the moderation result
    const moderationResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "video",
      contentId,
      userId,
      isApproved: parsedResult.requiresHumanReview ? false : parsedResult.isApproved,
      severity: parsedResult.severity || ModerationSeverity.NONE,
      categories: parsedResult.categories || thumbnailModeration.categories,
      confidence: parsedResult.confidence || 0.7,
      contextAware: true,
      moderationModel: "gpt-4o-video-analysis",
      moderationNotes: parsedResult.requiresHumanReview
        ? `Flagged for human review: ${parsedResult.moderationNotes || ""}`
        : parsedResult.moderationNotes || "",
      appealable: true,
    }

    // Store the moderation result
    await set(ref(db, `moderation/${moderationId}`), moderationResult)

    // If human review is required, mark it in a separate queue
    if (parsedResult.requiresHumanReview) {
      await set(ref(db, `moderation-queue/video/${contentId}`), {
        moderationId,
        userId,
        timestamp: serverTimestamp(),
        videoUrl,
        thumbnailUrl,
        initialAssessment: moderationResult.moderationNotes,
      })
    }

    // Update the content status
    await set(ref(db, `content/${contentId}/moderationStatus`), {
      isApproved: moderationResult.isApproved,
      requiresHumanReview: parsedResult.requiresHumanReview || false,
      moderationId,
      timestamp: serverTimestamp(),
    })

    return moderationResult
  } catch (error) {
    console.error("Error moderating video:", error)

    // Fallback to basic moderation in case of error
    const moderationId = push(ref(db, "moderation")).key as string

    const fallbackResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "video",
      contentId,
      userId,
      isApproved: false, // Default to not approved for videos in case of error
      severity: ModerationSeverity.MEDIUM,
      categories: [ContentCategory.SAFE],
      confidence: 0.5,
      contextAware: false,
      moderationModel: "fallback-rule-based",
      moderationNotes: "Flagged for human review due to moderation service error",
      appealable: true,
    }

    // Store the fallback result
    await set(ref(db, `moderation/${moderationId}`), fallbackResult)

    // Add to human review queue
    await set(ref(db, `moderation-queue/video/${contentId}`), {
      moderationId,
      userId,
      timestamp: serverTimestamp(),
      videoUrl,
      thumbnailUrl,
      initialAssessment: "System error - requires human review",
    })

    // Update the content status
    await set(ref(db, `content/${contentId}/moderationStatus`), {
      isApproved: false,
      requiresHumanReview: true,
      moderationId,
      timestamp: serverTimestamp(),
    })

    return fallbackResult
  }
}

/**
 * Moderates audio content using AI models
 */
export async function moderateAudio(audioUrl: string, userId: string, contentId: string): Promise<ModerationResult> {
  try {
    // Generate a unique ID for this moderation result
    const moderationId = push(ref(db, "moderation")).key as string

    // For audio content, we would ideally use a speech-to-text API followed by text moderation
    // For this implementation, we'll use OpenAI to analyze the audio URL
    const { text: analysisResult } = await generateText({
      model: openai("gpt-4o"),
      system: `
        You are an advanced audio moderation system. Analyze the provided audio URL and return a JSON object with the following structure:
        {
          "isApproved": boolean,
          "severity": "none" | "low" | "medium" | "high" | "critical",
          "categories": string[], // Array of detected categories
          "confidence": number, // 0-1 value
          "moderationNotes": string,
          "requiresHumanReview": boolean,
          "transcriptionNeeded": boolean
        }
        
        Guidelines:
        - For audio content, be cautious and flag for human review if uncertain
        - Consider that audio may contain speech that requires transcription
        - Flag any potential violations for human review
        - Be especially vigilant for hate speech, harassment, and unauthorized promotions
      `,
      prompt: `Analyze this audio for moderation. Audio URL: ${audioUrl}`,
      temperature: 0.1,
      max_tokens: 500,
    })

    // Parse the analysis result
    let parsedResult
    try {
      // Extract JSON from the response if needed
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : analysisResult
      parsedResult = JSON.parse(jsonString)
    } catch (parseError) {
      console.error("Error parsing audio moderation result:", parseError)
      // Fallback to conservative approach
      parsedResult = {
        isApproved: false,
        severity: ModerationSeverity.MEDIUM,
        categories: [ContentCategory.SAFE],
        confidence: 0.5,
        moderationNotes: "Parsing error - requires human review",
        requiresHumanReview: true,
        transcriptionNeeded: true,
      }
    }

    // Create the moderation result
    const moderationResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "audio",
      contentId,
      userId,
      isApproved: parsedResult.requiresHumanReview ? false : parsedResult.isApproved,
      severity: parsedResult.severity || ModerationSeverity.NONE,
      categories: parsedResult.categories || [ContentCategory.SAFE],
      confidence: parsedResult.confidence || 0.6,
      contextAware: true,
      moderationModel: "gpt-4o-audio-analysis",
      moderationNotes: parsedResult.requiresHumanReview
        ? `Flagged for human review: ${parsedResult.moderationNotes || ""}`
        : parsedResult.moderationNotes || "",
      appealable: true,
    }

    // Store the moderation result
    await set(ref(db, `moderation/${moderationId}`), moderationResult)

    // If human review is required, mark it in a separate queue
    if (parsedResult.requiresHumanReview) {
      await set(ref(db, `moderation-queue/audio/${contentId}`), {
        moderationId,
        userId,
        timestamp: serverTimestamp(),
        audioUrl,
        initialAssessment: moderationResult.moderationNotes,
        transcriptionNeeded: parsedResult.transcriptionNeeded || false,
      })
    }

    // Update the content status
    await set(ref(db, `content/${contentId}/moderationStatus`), {
      isApproved: moderationResult.isApproved,
      requiresHumanReview: parsedResult.requiresHumanReview || false,
      moderationId,
      timestamp: serverTimestamp(),
    })

    return moderationResult
  } catch (error) {
    console.error("Error moderating audio:", error)

    // Fallback to basic moderation in case of error
    const moderationId = push(ref(db, "moderation")).key as string

    const fallbackResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "audio",
      contentId,
      userId,
      isApproved: false, // Default to not approved for audio in case of error
      severity: ModerationSeverity.MEDIUM,
      categories: [ContentCategory.SAFE],
      confidence: 0.5,
      contextAware: false,
      moderationModel: "fallback-rule-based",
      moderationNotes: "Flagged for human review due to moderation service error",
      appealable: true,
    }

    // Store the fallback result
    await set(ref(db, `moderation/${moderationId}`), fallbackResult)

    // Add to human review queue
    await set(ref(db, `moderation-queue/audio/${contentId}`), {
      moderationId,
      userId,
      timestamp: serverTimestamp(),
      audioUrl,
      initialAssessment: "System error - requires human review",
      transcriptionNeeded: true,
    })

    // Update the content status
    await set(ref(db, `content/${contentId}/moderationStatus`), {
      isApproved: false,
      requiresHumanReview: true,
      moderationId,
      timestamp: serverTimestamp(),
    })

    return fallbackResult
  }
}

/**
 * Gets the moderation result for a specific content
 */
export async function getModerationResult(contentId: string): Promise<ModerationResult | null> {
  try {
    const contentRef = ref(db, `content/${contentId}/moderationStatus`)
    const contentSnapshot = await get(contentRef)

    if (!contentSnapshot.exists()) {
      return null
    }

    const moderationStatus = contentSnapshot.val()
    const moderationId = moderationStatus.moderationId

    if (!moderationId) {
      return null
    }

    const moderationRef = ref(db, `moderation/${moderationId}`)
    const moderationSnapshot = await get(moderationRef)

    if (!moderationSnapshot.exists()) {
      return null
    }

    return moderationSnapshot.val() as ModerationResult
  } catch (error) {
    console.error("Error getting moderation result:", error)
    return null
  }
}

/**
 * Gets a summary of moderation results for display to users
 */
export async function getModerationSummary(contentId: string): Promise<{
  isSafe: boolean
  moderationLevel: string
  lastChecked: string
  categories: string[]
}> {
  try {
    const result = await getModerationResult(contentId)

    if (!result) {
      return {
        isSafe: false,
        moderationLevel: "Unknown",
        lastChecked: "Never",
        categories: [],
      }
    }

    // Format the timestamp
    const date = new Date(result.timestamp)
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`

    // Map severity to user-friendly terms
    let moderationLevel = "Unknown"
    switch (result.severity) {
      case ModerationSeverity.NONE:
        moderationLevel = "Safe"
        break
      case ModerationSeverity.LOW:
        moderationLevel = "Mostly Safe"
        break
      case ModerationSeverity.MEDIUM:
        moderationLevel = "Potentially Sensitive"
        break
      case ModerationSeverity.HIGH:
        moderationLevel = "Sensitive"
        break
      case ModerationSeverity.CRITICAL:
        moderationLevel = "Unsafe"
        break
    }

    // Map categories to user-friendly terms
    const categoryMap: Record<ContentCategory, string> = {
      [ContentCategory.SAFE]: "Safe Content",
      [ContentCategory.HARASSMENT]: "Harassment",
      [ContentCategory.HATE_SPEECH]: "Hate Speech",
      [ContentCategory.SELF_HARM]: "Self Harm",
      [ContentCategory.SEXUAL]: "Sexual Content",
      [ContentCategory.VIOLENCE]: "Violence",
      [ContentCategory.GAMBLING]: "Gambling",
      [ContentCategory.UNAUTHORIZED_PROMOTION]: "Unauthorized Promotion",
      [ContentCategory.SPAM]: "Spam",
      [ContentCategory.MISINFORMATION]: "Misinformation",
      [ContentCategory.SARCASM]: "Sarcasm",
      [ContentCategory.ROASTING]: "Roasting",
    }

    const categories = result.categories.map((category) => categoryMap[category] || category)

    return {
      isSafe: result.isApproved,
      moderationLevel,
      lastChecked: formattedDate,
      categories,
    }
  } catch (error) {
    console.error("Error getting moderation summary:", error)
    return {
      isSafe: false,
      moderationLevel: "Error",
      lastChecked: "Unknown",
      categories: ["Error"],
    }
  }
}

/**
 * Basic fallback function to check for prohibited content
 * Only used as a last resort if AI moderation fails
 */
function containsBasicProhibitedContent(text: string): boolean {
  const lowerText = text.toLowerCase()

  // Very basic list of prohibited terms
  const prohibitedTerms = [
    "kill yourself",
    "kys",
    "commit suicide",
    "nigger",
    "faggot",
    "retard",
    "child porn",
    "cp",
    "rape",
    "terrorist",
  ]

  return prohibitedTerms.some((term) => lowerText.includes(term))
}

/**
 * Appeals a moderation decision
 */
export async function appealModeration(moderationId: string, userId: string, reason: string): Promise<boolean> {
  try {
    // Check if the moderation exists
    const moderationRef = ref(db, `moderation/${moderationId}`)
    const moderationSnapshot = await get(moderationRef)

    if (!moderationSnapshot.exists()) {
      return false
    }

    const moderation = moderationSnapshot.val() as ModerationResult

    // Check if the appeal is allowed
    if (!moderation.appealable) {
      return false
    }

    // Create the appeal
    const appealRef = push(ref(db, "moderation-appeals"))
    await set(appealRef, {
      moderationId,
      userId,
      contentId: moderation.contentId,
      contentType: moderation.contentType,
      reason,
      timestamp: serverTimestamp(),
      status: "pending",
    })

    return true
  } catch (error) {
    console.error("Error appealing moderation:", error)
    return false
  }
}


