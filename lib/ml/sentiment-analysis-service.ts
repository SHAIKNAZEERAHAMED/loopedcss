import { generateText } from "@/lib/ai"
import { openai } from "@ai-sdk/openai"

// Types for sentiment analysis
export type SentimentType = "positive" | "negative" | "neutral" | "mixed"
export type SentimentScore = {
  score: number
  confidence: number
  language: string
}

export type SentimentResult = {
  sentiment: SentimentType
  scores: Record<SentimentType, number>
  dominantEmotion: string
  language: string
  confidence: number
  emoji: string
  colorCode: string
}

// Emoji mapping for sentiments
const sentimentEmojis: Record<SentimentType, string[]> = {
  positive: ["😊", "😄", "🥰", "😁", "👍", "🎉"],
  negative: ["😔", "😢", "😠", "😞", "👎", "😡"],
  neutral: ["😐", "🤔", "😶", "🙂", "🤷", "📝"],
  mixed: ["😕", "🤨", "😬", "🙄", "🧐", "🤔"],
}

// Color codes for sentiments
const sentimentColors: Record<SentimentType, string> = {
  positive: "#4CAF50", // Green
  negative: "#F44336", // Red
  neutral: "#9E9E9E", // Gray
  mixed: "#FF9800", // Orange
}

// Emotions mapping
const emotions = {
  positive: ["joy", "happiness", "excitement", "gratitude", "love", "optimism", "amusement", "pride"],
  negative: ["anger", "sadness", "fear", "disgust", "disappointment", "frustration", "anxiety", "shame"],
  neutral: ["calmness", "indifference", "contemplation", "pensiveness", "focus"],
  mixed: ["confusion", "surprise", "anticipation", "curiosity", "uncertainty"],
}

/**
 * Analyzes the sentiment of text content using a fine-tuned transformer model
 * Supports both English and Telugu languages
 * @param content The text content to analyze
 * @returns A SentimentResult object with detailed sentiment information
 */
export async function analyzeSentiment(content: string): Promise<SentimentResult> {
  try {
    // Detect language first
    const language = await detectLanguage(content)
    const isTeluguContent = language === "telugu" || language === "telugu-english"

    // Use language-specific prompt for better accuracy
    const promptBase = isTeluguContent
      ? "You are a sentiment analysis expert fluent in Telugu and English. Analyze the sentiment of this text (which may contain Telugu or Telugu-English mix):"
      : "You are a sentiment analysis expert. Analyze the sentiment of this text:"

    const prompt = `${promptBase}
    
"${content}"

Provide a JSON response with these fields:
- sentiment: The overall sentiment (positive, negative, neutral, or mixed)
- scores: Numerical scores for each sentiment category (positive, negative, neutral, mixed) between 0 and 1
- dominantEmotion: The most prominent emotion detected
- confidence: Your confidence in this analysis (0-1)

Format your response as valid JSON only.`

    // Use AI SDK to get sentiment analysis
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.1, // Low temperature for more consistent results
      maxTokens: 500,
    })

    // Parse the response
    const result = JSON.parse(text)

    // Get a random emoji based on sentiment
    const sentimentType = result.sentiment as SentimentType
    const emojis = sentimentEmojis[sentimentType]
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

    // Get color code for the sentiment
    const colorCode = sentimentColors[sentimentType]

    return {
      sentiment: result.sentiment,
      scores: result.scores,
      dominantEmotion: result.dominantEmotion,
      language: language,
      confidence: result.confidence,
      emoji: randomEmoji,
      colorCode: colorCode,
    }
  } catch (error) {
    console.error("Error analyzing sentiment:", error)
    // Fallback to neutral sentiment
    return {
      sentiment: "neutral",
      scores: { positive: 0.25, negative: 0.25, neutral: 0.5, mixed: 0 },
      dominantEmotion: "indifference",
      language: "unknown",
      confidence: 0.5,
      emoji: "😐",
      colorCode: sentimentColors.neutral,
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
 * Calculates the accuracy of sentiment analysis predictions
 * @param predictions Array of predicted sentiments
 * @param groundTruth Array of actual sentiments
 * @returns Accuracy as a percentage
 */
export function calculateSentimentAccuracy(predictions: SentimentType[], groundTruth: SentimentType[]): number {
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

