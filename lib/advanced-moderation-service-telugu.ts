import { ref, set, push, serverTimestamp } from "firebase/database"
import { db } from "./firebase/config"
import { generateText } from "@/lib/ai"
import { openai } from "@ai-sdk/openai"
import {
  type ModerationResult,
  type ContentType,
  ModerationSeverity,
  ContentCategory,
} from "./advanced-moderation-service"

/**
 * Detects the language of the provided text
 */
export async function detectLanguage(text: string): Promise<{
  language: string
  confidence: number
  isTeluguOrHindi: boolean
}> {
  try {
    const { text: result } = await generateText({
      model: openai("gpt-4o"),
      system: `
        You are a language detection system. Analyze the provided text and return a JSON object with:
        {
          "language": string, // The detected language name
          "languageCode": string, // ISO code
          "confidence": number, // 0-1 value
          "isTeluguOrHindi": boolean // Whether it's Telugu or Hindi
        }
      `,
      prompt: `Detect the language of this text: "${text}"`,
      temperature: 0.1,
      max_tokens: 100,
    })

    // Parse the result
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? jsonMatch[0] : result
    const parsed = JSON.parse(jsonString)

    return {
      language: parsed.language || "Unknown",
      confidence: parsed.confidence || 0.5,
      isTeluguOrHindi: parsed.isTeluguOrHindi || false,
    }
  } catch (error) {
    console.error("Error detecting language:", error)
    return {
      language: "Unknown",
      confidence: 0,
      isTeluguOrHindi: false,
    }
  }
}

/**
 * Moderates Telugu text content using specialized models
 */
export async function moderateTeluguText(text: string, userId: string, contentId: string): Promise<ModerationResult> {
  try {
    // Generate a unique ID for this moderation result
    const moderationId = push(ref(db, "moderation")).key as string

    // Use OpenAI to analyze the Telugu text with context awareness
    const { text: analysisResult } = await generateText({
      model: openai("gpt-4o"),
      system: `
        You are an advanced content moderation system specialized in Telugu language.
        Analyze the provided text and return a JSON object with the following structure:
        {
          "isApproved": boolean,
          "severity": "none" | "low" | "medium" | "high" | "critical",
          "categories": string[], // Array of detected categories
          "confidence": number, // 0-1 value
          "contextAware": boolean,
          "moderationNotes": string,
          "isSarcasm": boolean,
          "isRoasting": boolean,
          "isHarmfulRoasting": boolean,
          "teluguSpecificContext": string // Any Telugu-specific cultural context
        }
        
        Guidelines:
        - Be aware of Telugu slang and colloquial expressions
        - Understand Telugu cultural references and context
        - Distinguish between harmful content and friendly teasing in Telugu
        - Consider Telugu-specific expressions that might seem offensive in direct translation
        - Detect unauthorized promotions for gambling or betting apps in Telugu
        - Flag misinformation about serious topics in Telugu context
        - Detect subtle harassment or bullying in Telugu
      `,
      prompt: `Analyze this Telugu text for moderation: "${text}"`,
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
      console.error("Error parsing Telugu moderation result:", parseError)
      // Fallback to basic moderation
      parsedResult = {
        isApproved: true,
        severity: ModerationSeverity.NONE,
        categories: [ContentCategory.SAFE],
        confidence: 0.7,
        contextAware: false,
        moderationNotes: "Fallback moderation due to parsing error",
        isSarcasm: false,
        isRoasting: false,
        isHarmfulRoasting: false,
        teluguSpecificContext: "",
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
      contentType: "text" as ContentType,
      contentId,
      userId,
      isApproved: parsedResult.isApproved,
      severity: parsedResult.severity || ModerationSeverity.NONE,
      categories,
      confidence: parsedResult.confidence || 0.8,
      contextAware: parsedResult.contextAware || true,
      moderationModel: "gpt-4o-telugu",
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
      language: "Telugu",
      teluguSpecificContext: parsedResult.teluguSpecificContext || "",
    })

    return moderationResult
  } catch (error) {
    console.error("Error moderating Telugu text:", error)

    // Fallback to basic moderation in case of error
    const moderationId = push(ref(db, "moderation")).key as string

    const fallbackResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "text" as ContentType,
      contentId,
      userId,
      isApproved: true, // Default to approved for fallback
      severity: ModerationSeverity.NONE,
      categories: [ContentCategory.SAFE],
      confidence: 0.6,
      contextAware: false,
      moderationModel: "fallback-telugu",
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
      language: "Telugu",
    })

    return fallbackResult
  }
}

/**
 * Translates Telugu content to English for additional moderation if needed
 */
export async function translateTeluguToEnglish(text: string): Promise<string> {
  try {
    const { text: translatedText } = await generateText({
      model: openai("gpt-4o"),
      system:
        "You are a Telugu to English translator. Translate the provided Telugu text to English accurately, preserving the meaning and context.",
      prompt: `Translate this Telugu text to English: "${text}"`,
      temperature: 0.3,
      max_tokens: 1000,
    })

    return translatedText
  } catch (error) {
    console.error("Error translating Telugu to English:", error)
    return text // Return original text if translation fails
  }
}

/**
 * Moderates mixed Telugu-English (Tenglish) content
 */
export async function moderateTenglishText(text: string, userId: string, contentId: string): Promise<ModerationResult> {
  try {
    // Generate a unique ID for this moderation result
    const moderationId = push(ref(db, "moderation")).key as string

    // Use OpenAI to analyze the Tenglish text with context awareness
    const { text: analysisResult } = await generateText({
      model: openai("gpt-4o"),
      system: `
        You are an advanced content moderation system specialized in Telugu-English mixed language (Tenglish).
        Analyze the provided text and return a JSON object with the following structure:
        {
          "isApproved": boolean,
          "severity": "none" | "low" | "medium" | "high" | "critical",
          "categories": string[], // Array of detected categories
          "confidence": number, // 0-1 value
          "contextAware": boolean,
          "moderationNotes": string,
          "isSarcasm": boolean,
          "isRoasting": boolean,
          "isHarmfulRoasting": boolean,
          "tenglishSpecificContext": string // Any Tenglish-specific cultural context
        }
        
        Guidelines:
        - Be aware of Telugu words written in English script
        - Understand Telugu slang mixed with English
        - Recognize Telugu expressions and idioms written in English
        - Detect code-switching between Telugu and English
        - Understand cultural references specific to Telugu speakers
        - Detect subtle harassment or bullying in Tenglish
      `,
      prompt: `Analyze this Telugu-English mixed text for moderation: "${text}"`,
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
      console.error("Error parsing Tenglish moderation result:", parseError)
      // Fallback to basic moderation
      parsedResult = {
        isApproved: true,
        severity: ModerationSeverity.NONE,
        categories: [ContentCategory.SAFE],
        confidence: 0.7,
        contextAware: false,
        moderationNotes: "Fallback moderation due to parsing error",
        isSarcasm: false,
        isRoasting: false,
        isHarmfulRoasting: false,
        tenglishSpecificContext: "",
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
      contentType: "text" as ContentType,
      contentId,
      userId,
      isApproved: parsedResult.isApproved,
      severity: parsedResult.severity || ModerationSeverity.NONE,
      categories,
      confidence: parsedResult.confidence || 0.8,
      contextAware: parsedResult.contextAware || true,
      moderationModel: "gpt-4o-tenglish",
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
      language: "Tenglish",
      tenglishSpecificContext: parsedResult.tenglishSpecificContext || "",
    })

    return moderationResult
  } catch (error) {
    console.error("Error moderating Tenglish text:", error)

    // Fallback to basic moderation in case of error
    const moderationId = push(ref(db, "moderation")).key as string

    const fallbackResult: ModerationResult = {
      id: moderationId,
      timestamp: Date.now(),
      contentType: "text" as ContentType,
      contentId,
      userId,
      isApproved: true, // Default to approved for fallback
      severity: ModerationSeverity.NONE,
      categories: [ContentCategory.SAFE],
      confidence: 0.6,
      contextAware: false,
      moderationModel: "fallback-tenglish",
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
      language: "Tenglish",
    })

    return fallbackResult
  }
}


