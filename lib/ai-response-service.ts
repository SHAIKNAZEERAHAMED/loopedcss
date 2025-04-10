import { ref, set, get, push, onValue, off } from "firebase/database"
import { db } from "./firebase/config"
import { generateText } from "@/lib/ai"
import { openai } from "@ai-sdk/openai"
import { detectLanguage, translateTeluguToEnglish } from "./advanced-moderation-service-telugu"

// Types for AI responses
export interface AIResponse {
  id: string
  postId: string
  content: string
  timestamp: number
  language: string
  sentiment: string
  isTeluguResponse: boolean
}

// Telugu phrases for BOB AI responses
const teluguGreetings = [
  "నమస్కారం", // Namaskaram (Hello)
  "బాగున్నారా", // Baagunnara (How are you)
  "ఎలా ఉన్నారు", // Ela unnaru (How are you)
  "శుభోదయం", // Subhodayam (Good morning)
  "శుభ సాయంత్రం", // Subha saayantram (Good evening)
]

const teluguPositiveResponses = [
  "చాలా బాగుంది!", // Chaala baagundi (Very good)
  "అద్భుతం!", // Adbhutam (Amazing)
  "నాకు ఇది చాలా నచ్చింది", // Naaku idi chaala nachindi (I liked this a lot)
  "మంచి పోస్ట్!", // Manchi post (Good post)
  "నువ్వు సూపర్ రా!", // Nuvvu super ra (You're super)
]

const teluguNeutralResponses = [
  "ఆసక్తికరంగా ఉంది", // Aasaktikaranga undi (Interesting)
  "నేను అర్థం చేసుకున్నాను", // Nenu artham chesukunnanu (I understand)
  "మరింత చెప్పండి", // Marinta cheppandi (Tell me more)
  "ఆలోచించడానికి మంచి విషయం", // Aalochinchataniki manchi vishayam (Good point to think about)
]

const teluguSupportiveResponses = [
  "నేను మీకు సహాయం చేయగలను", // Nenu meeku sahaayam cheyyagalanu (I can help you)
  "చింతించకండి", // Chintinchakanḍi (Don't worry)
  "అంతా బాగుంటుంది", // Antha baguntundi (Everything will be fine)
  "మీరు దీన్ని చేయగలరు!", // Meeru deenni cheyyagalaru (You can do this)
]

// Tenglish (Telugu written in English) phrases
const tenglishGreetings = ["Namaskaram", "Baagunnara", "Ela unnaru", "Subhodayam", "Subha saayantram"]

const tenglishPositiveResponses = [
  "Chaala baagundi!",
  "Adbhutam!",
  "Naaku idi chaala nachindi",
  "Manchi post!",
  "Nuvvu super ra!",
  "Mass post mama!",
  "Keka ra!",
]

const tenglishNeutralResponses = [
  "Aasaktikaranga undi",
  "Nenu artham chesukunnanu",
  "Marinta cheppandi",
  "Aalochinchataniki manchi vishayam",
  "Sare, telusu",
]

const tenglishSupportiveResponses = [
  "Nenu meeku sahaayam cheyyagalanu",
  "Chintinchakanḍi",
  "Antha baguntundi",
  "Meeru deenni cheyyagalaru!",
  "Tension padaku, nenu unna",
]

// Get a random phrase from an array
function getRandomPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)]
}

/**
 * Generates an AI response to a post
 */
export async function generateAIResponse(
  postId: string,
  postContent: string,
  postAuthorId: string,
): Promise<AIResponse> {
  try {
    // Check if the post already has an AI response
    const existingResponseRef = ref(db, `ai-responses/${postId}`)
    const existingResponseSnapshot = await get(existingResponseRef)

    if (existingResponseSnapshot.exists()) {
      return existingResponseSnapshot.val() as AIResponse
    }

    // Detect language of the post
    const languageInfo = await detectLanguage(postContent)
    const isTeluguOrHindi = languageInfo.isTeluguOrHindi

    // Generate response based on language
    let aiResponseContent = ""
    const responseLanguage = languageInfo.language

    if (isTeluguOrHindi) {
      // For Telugu content, use predefined Telugu responses with some personalization
      const translatedContent = await translateTeluguToEnglish(postContent)

      // Analyze sentiment of the translated content
      const { text: sentimentResult } = await generateText({
        model: openai("gpt-4o"),
        system:
          "You are a sentiment analyzer. Analyze the text and return only one word: 'positive', 'negative', or 'neutral'.",
        prompt: `Analyze the sentiment of this text: "${translatedContent}"`,
        temperature: 0.1,
        max_tokens: 10,
      })

      const sentiment = sentimentResult.trim().toLowerCase()

      // Select appropriate response based on sentiment
      if (sentiment === "positive") {
        // For positive posts, use a positive response
        aiResponseContent = isTeluguOrHindi
          ? `${getRandomPhrase(teluguGreetings)}! ${getRandomPhrase(teluguPositiveResponses)}`
          : `${getRandomPhrase(tenglishGreetings)}! ${getRandomPhrase(tenglishPositiveResponses)}`
      } else if (sentiment === "negative") {
        // For negative posts, use a supportive response
        aiResponseContent = isTeluguOrHindi
          ? `${getRandomPhrase(teluguGreetings)}. ${getRandomPhrase(teluguSupportiveResponses)}`
          : `${getRandomPhrase(tenglishGreetings)}. ${getRandomPhrase(tenglishSupportiveResponses)}`
      } else {
        // For neutral posts, use a neutral response
        aiResponseContent = isTeluguOrHindi
          ? `${getRandomPhrase(teluguNeutralResponses)}`
          : `${getRandomPhrase(tenglishNeutralResponses)}`
      }

      // Add a personalized touch using BOB's slang style
      if (Math.random() > 0.5) {
        aiResponseContent += isTeluguOrHindi
          ? " 😊 BOB ఇక్కడ ఉన్నాను!" // BOB is here!
          : " 😊 BOB ikkada unnanu!" // BOB is here! (in Tenglish)
      }
    } else {
      // For non-Telugu content, generate a response using AI
      const { text: generatedResponse } = await generateText({
        model: openai("gpt-4o"),
        system: `
          You are BOB, a friendly AI assistant for a social media platform. 
          Your responses should be brief (1-2 sentences), friendly, and conversational.
          Occasionally use phrases like "BOB here!" or "BOB thinks..." to establish your identity.
          Be supportive, positive, and engaging.
          Never be negative or critical.
          Respond directly to the content of the post.
        `,
        prompt: `Respond to this social media post: "${postContent}"`,
        temperature: 0.7,
        max_tokens: 100,
      })

      aiResponseContent = generatedResponse.trim()
    }

    // Generate a unique ID for this response
    const responseId = push(ref(db, "ai-responses")).key as string

    // Create the AI response object
    const aiResponse: AIResponse = {
      id: responseId,
      postId,
      content: aiResponseContent,
      timestamp: Date.now(),
      language: responseLanguage,
      sentiment: "positive", // Default to positive for predefined responses
      isTeluguResponse: isTeluguOrHindi,
    }

    // Store the AI response
    await set(ref(db, `ai-responses/${postId}`), aiResponse)

    return aiResponse
  } catch (error) {
    console.error("Error generating AI response:", error)

    // Fallback to a simple response
    const responseId = push(ref(db, "ai-responses")).key as string

    const fallbackResponse: AIResponse = {
      id: responseId,
      postId,
      content: "BOB here! Nice post! 😊",
      timestamp: Date.now(),
      language: "English",
      sentiment: "positive",
      isTeluguResponse: false,
    }

    // Store the fallback response
    await set(ref(db, `ai-responses/${postId}`), fallbackResponse)

    return fallbackResponse
  }
}

/**
 * Gets the AI response for a specific post
 */
export async function getAIResponse(postId: string): Promise<AIResponse | null> {
  try {
    const responseRef = ref(db, `ai-responses/${postId}`)
    const responseSnapshot = await get(responseRef)

    if (!responseSnapshot.exists()) {
      return null
    }

    return responseSnapshot.val() as AIResponse
  } catch (error) {
    console.error("Error getting AI response:", error)
    return null
  }
}

/**
 * Listens for new posts and generates AI responses
 */
export function listenForNewPosts(callback?: (response: AIResponse) => void): () => void {
  const postsRef = ref(db, "posts")

  const handleNewPost = async (snapshot: any) => {
    const posts = snapshot.val()
    if (!posts) return

    // Process each post
    for (const postId in posts) {
      const post = posts[postId]

      // Check if this post already has an AI response
      const responseRef = ref(db, `ai-responses/${postId}`)
      const responseSnapshot = await get(responseRef)

      if (!responseSnapshot.exists() && post.content) {
        // Generate a response for this post
        const response = await generateAIResponse(postId, post.content, post.userId)

        if (callback) {
          callback(response)
        }
      }
    }
  }

  // Listen for changes
  onValue(postsRef, handleNewPost)

  // Return a function to unsubscribe
  return () => {
    off(postsRef, "value", handleNewPost)
  }
}

/**
 * Generates a personalized AI response to a user's comment
 */
export async function generateCommentResponse(
  commentId: string,
  commentContent: string,
  commentAuthorId: string,
  postId: string,
): Promise<AIResponse> {
  try {
    // Detect language of the comment
    const languageInfo = await detectLanguage(commentContent)
    const isTeluguOrHindi = languageInfo.isTeluguOrHindi

    // Generate response based on language
    let aiResponseContent = ""
    const responseLanguage = languageInfo.language

    if (isTeluguOrHindi) {
      // For Telugu content, use predefined Telugu responses
      aiResponseContent = isTeluguOrHindi
        ? `${getRandomPhrase(teluguPositiveResponses)} ${getRandomPhrase(teluguSupportiveResponses)}`
        : `${getRandomPhrase(tenglishPositiveResponses)} ${getRandomPhrase(tenglishSupportiveResponses)}`

      // Add BOB's signature style
      if (Math.random() > 0.5) {
        aiResponseContent += isTeluguOrHindi ? " - BOB" : " - BOB"
      }
    } else {
      // For non-Telugu content, generate a response using AI
      const { text: generatedResponse } = await generateText({
        model: openai("gpt-4o"),
        system: `
          You are BOB, a friendly AI assistant for a social media platform. 
          Your responses to comments should be brief (1 sentence), friendly, and conversational.
          Occasionally use phrases like "BOB agrees!" or "BOB thinks..." to establish your identity.
          Be supportive and positive.
          Never be negative or critical.
        `,
        prompt: `Respond to this comment on a social media post: "${commentContent}"`,
        temperature: 0.7,
        max_tokens: 50,
      })

      aiResponseContent = generatedResponse.trim()
    }

    // Generate a unique ID for this response
    const responseId = push(ref(db, "ai-responses")).key as string

    // Create the AI response object
    const aiResponse: AIResponse = {
      id: responseId,
      postId: commentId, // Using commentId as the postId for this response
      content: aiResponseContent,
      timestamp: Date.now(),
      language: responseLanguage,
      sentiment: "positive", // Default to positive for comment responses
      isTeluguResponse: isTeluguOrHindi,
    }

    // Store the AI response
    await set(ref(db, `ai-comment-responses/${commentId}`), aiResponse)

    return aiResponse
  } catch (error) {
    console.error("Error generating comment response:", error)

    // Fallback to a simple response
    const responseId = push(ref(db, "ai-responses")).key as string

    const fallbackResponse: AIResponse = {
      id: responseId,
      postId: commentId,
      content: "BOB agrees! 👍",
      timestamp: Date.now(),
      language: "English",
      sentiment: "positive",
      isTeluguResponse: false,
    }

    // Store the fallback response
    await set(ref(db, `ai-comment-responses/${commentId}`), fallbackResponse)

    return fallbackResponse
  }
}


