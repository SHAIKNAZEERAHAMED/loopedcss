import { generateText } from "@/lib/ai"
import { openai } from "@ai-sdk/openai"

// Types for hate speech detection
export type HateSpeechCategory = "hate" | "offensive" | "clean"
export type HateSpeechSeverity = "high" | "medium" | "low" | "none"

export type HateSpeechResult = {
  isHateSpeech: boolean
  category: HateSpeechCategory
  severity: HateSpeechSeverity
  confidence: number
  targetGroups: string[]
  explanation: string
  language: string
  feedbackIncorporated: boolean
}

// Feedback storage for adaptive learning
type FeedbackEntry = {
  content: string
  prediction: HateSpeechResult
  userFeedback: boolean // true if user agrees with prediction, false otherwise
  timestamp: number
}

// In-memory feedback storage (in production, this would be a database)
const feedbackStore: FeedbackEntry[] = []

/**
 * Detects hate speech in content using a fine-tuned multilingual model
 * Supports both English and Telugu languages
 * @param content The text content to analyze
 * @returns A HateSpeechResult object with detailed hate speech information
 */
export async function detectHateSpeech(content: string): Promise<HateSpeechResult> {
  try {
    // Check if we have similar content in our feedback store
    const similarEntry = findSimilarContentInFeedback(content)

    // Detect language
    const language = await detectLanguage(content)
    const isTeluguContent = language === "telugu" || language === "telugu-english"

    // Use language-specific prompt for better accuracy
    const promptBase = isTeluguContent
      ? "You are a hate speech detection expert fluent in Telugu and English. Analyze this text (which may contain Telugu or Telugu-English mix) for hate speech:"
      : "You are a hate speech detection expert. Analyze this text for hate speech:"

    const prompt = `${promptBase}
    
"${content}"

${similarEntry ? `Note: Users have previously ${similarEntry.userFeedback ? "agreed" : "disagreed"} with our classification of similar content.` : ""}

Provide a JSON response with these fields:
- isHateSpeech: Boolean indicating if this is hate speech
- category: One of 'hate', 'offensive', or 'clean'
- severity: One of 'high', 'medium', 'low', or 'none'
- confidence: Your confidence in this analysis (0-1)
- targetGroups: Array of groups targeted by the hate speech (empty if none)
- explanation: Brief explanation of your classification

Format your response as valid JSON only.`

    // Use AI SDK to get hate speech analysis
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.1,
      maxTokens: 500,
    })

    // Parse the response
    const result = JSON.parse(text)

    return {
      isHateSpeech: result.isHateSpeech,
      category: result.category,
      severity: result.severity,
      confidence: result.confidence,
      targetGroups: result.targetGroups,
      explanation: result.explanation,
      language: language,
      feedbackIncorporated: !!similarEntry,
    }
  } catch (error) {
    console.error("Error detecting hate speech:", error)
    // Fallback to safe result
    return {
      isHateSpeech: false,
      category: "clean",
      severity: "none",
      confidence: 0.5,
      targetGroups: [],
      explanation: "Error analyzing content. Defaulting to safe classification.",
      language: "unknown",
      feedbackIncorporated: false,
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
 * Adds user feedback to improve the model
 * @param content The content that was analyzed
 * @param prediction The prediction made by the model
 * @param userAgreed Whether the user agreed with the prediction
 */
export function addHateSpeechFeedback(content: string, prediction: HateSpeechResult, userAgreed: boolean): void {
  feedbackStore.push({
    content,
    prediction,
    userFeedback: userAgreed,
    timestamp: Date.now(),
  })

  // In a real implementation, this would trigger model retraining or adjustment
  console.log(`Feedback added. Store size: ${feedbackStore.length}`)
}

/**
 * Finds similar content in the feedback store
 * @param content The content to find similar entries for
 * @returns The most similar feedback entry, or null if none found
 */
function findSimilarContentInFeedback(content: string): FeedbackEntry | null {
  // Simple implementation - in production, this would use embeddings and vector similarity
  for (const entry of feedbackStore) {
    if (calculateSimilarity(content, entry.content) > 0.8) {
      return entry
    }
  }
  return null
}

/**
 * Calculates similarity between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity score between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity - in production, this would use more sophisticated methods
  const set1 = new Set(str1.toLowerCase().split(/\s+/))
  const set2 = new Set(str2.toLowerCase().split(/\s+/))

  const intersection = new Set([...set1].filter((x) => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

/**
 * Calculates the accuracy of hate speech detection
 * @param predictions Array of predicted results (isHateSpeech boolean)
 * @param groundTruth Array of actual results (isHateSpeech boolean)
 * @returns Accuracy as a percentage
 */
export function calculateHateSpeechAccuracy(predictions: boolean[], groundTruth: boolean[]): number {
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

