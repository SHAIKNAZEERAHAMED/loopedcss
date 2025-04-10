import { ref, get, set, push } from "firebase/database"
import { db } from "./firebase/config"
import { getUserProfile } from "./user-service"

// Interface for BOB's response
export interface BobResponse {
  message: string
  suggestions?: string[]
  isPersonalized: boolean
}

// Interface for user language preferences
export interface UserLanguagePreference {
  language: string
  gender?: "male" | "female" | "other" | "unknown"
}

/**
 * Gets a greeting from BOB based on user preferences
 */
export async function getBobGreeting(userId: string): Promise<BobResponse> {
  try {
    // Get user language preferences
    const userPrefs = await getUserLanguagePreference(userId)

    // Generate greeting based on preferences
    let greeting = "Hello! How can I help you today?"
    let isPersonalized = false

    if (userPrefs.language === "telugu") {
      isPersonalized = true
      if (userPrefs.gender === "male") {
        greeting = "బాబు చెప్పాలిరా?"
      } else if (userPrefs.gender === "female") {
        greeting = "అమ్మ చెప్పాలమ్మా?"
      } else {
        greeting = "నమస్కారం! నేను మీకు ఎలా సహాయం చేయగలను?"
      }
    } else if (userPrefs.language === "hindi") {
      isPersonalized = true
      greeting = "नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?"
    } else if (userPrefs.language === "tamil") {
      isPersonalized = true
      greeting = "வணக்கம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?"
    } else if (userPrefs.language === "kannada") {
      isPersonalized = true
      greeting = "ನಮಸ್ಕಾರ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?"
    } else if (userPrefs.language === "malayalam") {
      isPersonalized = true
      greeting = "നമസ്കാരം! എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാൻ കഴിയും?"
    }

    return {
      message: greeting,
      isPersonalized,
    }
  } catch (error) {
    console.error("Error getting BOB greeting:", error)
    return {
      message: "Hello! How can I help you today?",
      isPersonalized: false,
    }
  }
}

/**
 * Gets user language preference
 */
async function getUserLanguagePreference(userId: string): Promise<UserLanguagePreference> {
  try {
    // Check if user has saved language preferences
    const prefRef = ref(db, `users/${userId}/languagePreference`)
    const snapshot = await get(prefRef)

    if (snapshot.exists()) {
      return snapshot.val()
    }

    // If no preferences, check user profile for clues
    const userProfile = await getUserProfile(userId)

    // Default preferences
    const defaultPrefs: UserLanguagePreference = {
      language: "english",
      gender: "unknown",
    }

    return defaultPrefs
  } catch (error) {
    console.error("Error getting user language preference:", error)
    return {
      language: "english",
      gender: "unknown",
    }
  }
}

/**
 * Sets user language preference
 */
export async function setUserLanguagePreference(userId: string, preferences: UserLanguagePreference): Promise<void> {
  try {
    const prefRef = ref(db, `users/${userId}/languagePreference`)
    await set(prefRef, preferences)
  } catch (error) {
    console.error("Error setting user language preference:", error)
    throw error
  }
}

/**
 * Gets BOB's response to a user message
 */
export async function getBobResponse(userId: string, message: string): Promise<BobResponse> {
  try {
    // Get user language preferences
    const userPrefs = await getUserLanguagePreference(userId)

    // Log the conversation
    await logBobConversation(userId, message, "user")

    // Process the message and generate a response
    let response = ""
    let suggestions: string[] = []
    let isPersonalized = false

    // Check for common keywords
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
      // Greeting
      const greeting = await getBobGreeting(userId)
      response = greeting.message
      isPersonalized = greeting.isPersonalized
      suggestions = ["How does content moderation work?", "What is healthy roasting?", "How can I create a loop?"]
    } else if (
      lowerMessage.includes("moderation") ||
      lowerMessage.includes("filter") ||
      lowerMessage.includes("guidelines")
    ) {
      // Moderation related
      response =
        "Our moderation system uses AI to analyze content and ensure it follows community guidelines. We allow friendly roasting but block harmful content."
      suggestions = [
        "What is allowed in roasting?",
        "What content gets blocked?",
        "How can I appeal a moderation decision?",
      ]
    } else if (lowerMessage.includes("roast") || lowerMessage.includes("joke") || lowerMessage.includes("humor")) {
      // Roasting related
      response =
        "Healthy roasting is allowed! You can joke around and use sarcasm, but avoid personal attacks, hate speech, or targeting someone who doesn't want to participate."
      suggestions = [
        "What's considered a personal attack?",
        "How do I know if someone is okay with roasting?",
        "What happens if my content gets flagged?",
      ]
    } else {
      // Default response
      if (userPrefs.language === "telugu") {
        isPersonalized = true
        if (userPrefs.gender === "male") {
          response = "నాకు అర్థం కాలేదు బాబు. దయచేసి మరొక ప్రశ్న అడగండి."
        } else if (userPrefs.gender === "female") {
          response = "నాకు అర్థం కాలేదు అమ్మా. దయచేసి మరొక ప్రశ్న అడగండి."
        } else {
          response = "నాకు అర్థం కాలేదు. దయచేసి మరొక ప్రశ్న అడగండి."
        }
      } else {
        response = "I'm not sure I understand. Could you please rephrase your question?"
      }
      suggestions = ["How does content moderation work?", "What is healthy roasting?", "How can I create a loop?"]
    }

    // Log BOB's response
    await logBobConversation(userId, response, "bob")

    return {
      message: response,
      suggestions,
      isPersonalized,
    }
  } catch (error) {
    console.error("Error getting BOB response:", error)
    return {
      message: "I'm having trouble processing your request right now. Please try again later.",
      isPersonalized: false,
    }
  }
}

/**
 * Logs a conversation with BOB
 */
async function logBobConversation(userId: string, message: string, sender: "user" | "bob"): Promise<void> {
  try {
    const conversationRef = push(ref(db, `bob-conversations/${userId}`))
    await set(conversationRef, {
      message,
      sender,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Error logging BOB conversation:", error)
  }
}

/**
 * Analyzes a loop for roasting content
 */
export async function analyzeRoastingContent(
  transcript: string,
  mentionedUsers: string[],
): Promise<{
  isRoasting: boolean
  intensity: "mild" | "moderate" | "severe"
  feedback: string
}> {
  // Roasting indicators
  const mildRoastingTerms = ["funny", "silly", "goofy", "awkward", "weird"]
  const moderateRoastingTerms = ["fail", "mess up", "can't dance", "terrible", "awful"]
  const severeRoastingTerms = ["stupid", "idiot", "loser", "ugly", "fat", "hate"]

  // Check for roasting terms
  const foundMildTerms = mildRoastingTerms.filter((term) => transcript.toLowerCase().includes(term))

  const foundModerateTerms = moderateRoastingTerms.filter((term) => transcript.toLowerCase().includes(term))

  const foundSevereTerms = severeRoastingTerms.filter((term) => transcript.toLowerCase().includes(term))

  // Determine if this is roasting content
  const isRoasting = foundMildTerms.length > 0 || foundModerateTerms.length > 0 || foundSevereTerms.length > 0

  // Determine intensity
  let intensity: "mild" | "moderate" | "severe" = "mild"

  if (foundSevereTerms.length > 0) {
    intensity = "severe"
  } else if (foundModerateTerms.length > 0) {
    intensity = "moderate"
  }

  // Generate feedback
  let feedback = ""

  if (!isRoasting) {
    feedback = "This content doesn't appear to contain roasting."
  } else if (intensity === "mild") {
    feedback = "This loop contains mild roasting that's likely acceptable within our guidelines."
  } else if (intensity === "moderate") {
    feedback =
      "This loop contains moderate roasting. Make sure the people involved are comfortable with this type of humor."
  } else {
    feedback =
      "This loop contains severe roasting that may violate our community guidelines. Please revise to keep it respectful."
  }

  return {
    isRoasting,
    intensity,
    feedback,
  }
}


