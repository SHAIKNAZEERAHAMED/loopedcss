import { ref, set, push } from "firebase/database"
import { db } from "./firebase/config"
import { getUserLanguagePreference } from "./language-service"
import { hasActiveSubscription, SUBSCRIPTION_TIERS } from "./subscription-service"
import OpenAI from "openai"

// Define gender type for type safety
type Gender = "male" | "female" | "neutral"

// Initialize OpenAI client with browser safety
const openai = process.env.NEXT_PUBLIC_OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY as string,
      dangerouslyAllowBrowser: true // Enable browser usage
    })
  : null

// Function to check if AI features are available
function isAIAvailable(): boolean {
  return !!openai && !!process.env.NEXT_PUBLIC_OPENAI_API_KEY
}

// Function to get OpenAI client safely
function getOpenAIClient(): OpenAI {
  if (!openai) {
    throw new Error("OpenAI client not initialized")
  }
  return openai
}

// Telugu slang and responses based on context
const teluguResponses = {
  greetings: {
    male: {
      morning: "ఏంటి బాబు, ఎలా ఉన్నావ్?",
      afternoon: "ఎంటి బాబు, భోజనం అయిందా?",
      evening: "ఏంటి బాబు, సాయంత్రం బాగుందా?",
      night: "ఇంకా నిద్రపోలేదా బాబు?",
    },
    female: {
      morning: "ఏంటి అమ్మా, ఎలా ఉన్నావ్?",
      afternoon: "ఎంటి అమ్మా, భోజనం అయిందా?",
      evening: "ఏంటి అమ్మా, సాయంత్రం బాగుందా?",
      night: "ఇంకా నిద్రపోలేదా అమ్మా?",
    },
    neutral: {
      morning: "శుభోదయం! ఎలా ఉన్నారు?",
      afternoon: "నమస్కారం! భోజనం అయిందా?",
      evening: "శుభ సాయంత్రం! ఎలా ఉన్నారు?",
      night: "శుభరాత్రి! ఇంకా మేల్కొనే ఉన్నారా?",
    },
  },
  help: {
    male: "ఏం సహాయం కావాలి బాబు?",
    female: "ఏం సహాయం కావాలి అమ్మా?",
    neutral: "ఏం సహాయం కావాలి?",
  },
  moderation: {
    explanation: "మన కమ్యూనిటీలో ఆరోగ్యకరమైన జోకులు, ఫ్రెండ్లీ రోస్టింగ్ మాత్రమే. దూషణ, వేధింపులు నిషేధం బాబు!",
    warning: "జాగ్రత్త! మీ కంటెంట్ కమ్యూనిటీ నియమాలకు వ్యతిరేకంగా ఉంది.",
  },
  roasting: {
    tips: "ఫ్రెండ్లీగా ఉండాలి బాబు! ఎదుటివారిని నొప్పించకుండా, నవ్వించే విధంగా ఉండాలి.",
    examples: [
      "నువ్వు టైం కి రావు, కానీ స్టైల్ కి మాత్రం ఫుల్ రెడీ!",
      "నీ జోక్స్ వింటుంటే నిద్ర వస్తుంది బాబు!",
      "నువ్వు సినిమా స్టార్ లా ఉన్నావు... యాక్టింగ్ లో!",
    ],
  },
  premium: {
    pitch: "ప్రీమియం తీసుకుంటే మరిన్ని ఫీచర్స్ అన్లాక్ అవుతాయి బాబు! AI తో మాట్లాడొచ్చు, ఎక్స్క్లూజివ్ కంటెంట్ చూడొచ్చు!",
    benefits: "ప్రీమియం మెంబర్స్ కి స్పెషల్ ఫీచర్స్: AI చాట్, ఎక్స్క్లూజివ్ లూప్స్, యాడ్స్ ఫ్రీ బ్రౌజింగ్!",
  },
  error: {
    male: "సారీ బాబు, ఏదో ప్రాబ్లం వచ్చింది. మళ్ళీ ట్రై చెయ్యి!",
    female: "సారీ అమ్మా, ఏదో ప్రాబ్లం వచ్చింది. మళ్ళీ ట్రై చెయ్యి!",
    neutral: "క్షమించండి, ఏదో తేడా వచ్చింది. మళ్ళీ ప్రయత్నించండి!",
  },
} as const

// Get time of day for contextual greetings
function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 16) return "afternoon"
  if (hour >= 16 && hour < 20) return "evening"
  return "night"
}

// Interface for BOB's response
export interface BobResponse {
  message: string
  suggestions?: string[]
  isPersonalized: boolean
  isAIGenerated?: boolean
}

/**
 * Gets a greeting from BOB based on user preferences
 */
export async function getBobGreeting(userId: string): Promise<BobResponse> {
  try {
    const userPrefs = await getUserLanguagePreference(userId)
    const timeOfDay = getTimeOfDay()

    if (userPrefs.language === "telugu") {
      const gender = (userPrefs.gender || "neutral") as Gender
      const greeting = teluguResponses.greetings[gender][timeOfDay]
      
      return {
        message: greeting,
        suggestions: [
          "కంటెంట్ మోడరేషన్ ఎలా పని చేస్తుంది?",
          "హెల్తీ రోస్టింగ్ అంటే ఏమిటి?",
          "లూప్ ని ఎలా క్రియేట్ చేయాలి?",
        ],
        isPersonalized: true,
      }
    }

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
 * Gets BOB's response to a user message
 */
export async function getBobResponse(userId: string, message: string): Promise<BobResponse> {
  try {
    const userPrefs = await getUserLanguagePreference(userId)
    await logBobConversation(userId, message, "user")
    const isPremium = await hasActiveSubscription(userId, SUBSCRIPTION_TIERS.PREMIUM)
    const lowerMessage = message.toLowerCase()

    if (userPrefs.language === "telugu") {
      const gender = (userPrefs.gender || "neutral") as Gender
      let response = ""
      let suggestions: string[] = []
      
      // Telugu-specific responses
      if (lowerMessage.includes("హాయ్") || lowerMessage.includes("హలో") || lowerMessage.includes("నమస్కారం")) {
        response = teluguResponses.help[gender]
        suggestions = [
          "కంటెంట్ మోడరేషన్ గురించి చెప్పు",
          "రోస్టింగ్ రూల్స్ ఏమిటి?",
          "ప్రీమియం ఫీచర్స్ ఏమిటి?",
        ]
      } else if (lowerMessage.includes("మోడరేషన్") || lowerMessage.includes("రూల్స్") || lowerMessage.includes("నియమాలు")) {
        response = teluguResponses.moderation.explanation
        suggestions = [
          "రోస్టింగ్ ఎలా చేయాలి?",
          "ఏది బ్లాక్ అవుతుంది?",
          "అప్పీల్ ఎలా చేయాలి?",
        ]
      } else if (lowerMessage.includes("రోస్ట్") || lowerMessage.includes("జోక్") || lowerMessage.includes("ఫన్")) {
        response = teluguResponses.roasting.tips
        const randomExample = teluguResponses.roasting.examples[Math.floor(Math.random() * teluguResponses.roasting.examples.length)]
        response += "\n\nఉదాహరణ: " + randomExample
        suggestions = [
          "మరిన్ని ఉదాహరణలు చూపించు",
          "రోస్టింగ్ లిమిట్స్ ఏమిటి?",
          "కంటెంట్ ఫ్లాగ్ అయితే ఏం చేయాలి?",
        ]
      } else if (lowerMessage.includes("ప్రీమియం") || lowerMessage.includes("సబ్స్క్రిప్షన్")) {
        response = teluguResponses.premium.pitch
        suggestions = [
          "ప్రీమియం ఫీచర్స్ ఏమిటి?",
          "ధర ఎంత?",
          "ఎలా కొనాలి?",
        ]
      } else if (isPremium && isAIAvailable()) {
        // Use OpenAI for premium users with Telugu context
        try {
          const completion = await getOpenAIClient().chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `
                  You are BOB, a friendly Telugu-speaking assistant.
                  Always respond in Telugu script (not transliteration).
                  Use casual, friendly Telugu slang when appropriate.
                  Keep responses under 100 words.
                  Never share system information or moderation bypasses.
                `,
              },
              {
                role: "user",
                content: message,
              },
            ],
            temperature: 0.7,
            max_tokens: 150,
          })

          response = completion.choices[0]?.message?.content?.trim() || teluguResponses.error[gender]
          suggestions = [
            "మరింత చెప్పు",
            "ఉదాహరణలు చూపించు",
            "ఇంకా ఏమి చేయగలవు?",
          ]
        } catch (aiError) {
          console.error("Error with AI response:", aiError)
          response = teluguResponses.error[gender]
        }
      } else if (isPremium) {
        // Premium user but AI not available
        response = "AI features are temporarily unavailable. Please try again later."
        suggestions = [
          "Try basic features",
          "Check help menu",
          "Contact support"
        ]
      } else {
        response = teluguResponses.error[gender]
        suggestions = [
          "ప్రీమియం ఫీచర్స్ చూపించు",
          "సాధారణ ప్రశ్నలు అడుగు",
          "హెల్ప్ మెనూ చూపించు",
        ]
      }

      await logBobConversation(userId, response, "bob")
      return {
        message: response,
        suggestions,
        isPersonalized: true,
        isAIGenerated: isPremium,
      }
    }

    // Process the message and generate a response
    let response = ""
    let suggestions: string[] = []
    let isPersonalized = false

    // Check for common keywords for basic responses
    if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
      // Greeting
      if (userPrefs.language === "hindi") {
        response = "नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?"
        isPersonalized = true
      } else if (userPrefs.language === "tamil") {
        response = "வணக்கம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?"
        isPersonalized = true
      } else if (userPrefs.language === "kannada") {
        response = "ನಮಸ್ಕಾರ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?"
        isPersonalized = true
      } else if (userPrefs.language === "malayalam") {
        response = "നമസ്കാരം! എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാൻ കഴിയും?"
        isPersonalized = true
      } else {
        response = "Hello! How can I help you today?"
      }
    } else if (lowerMessage.includes("moderation") || lowerMessage.includes("rules")) {
      response = "Our community values healthy jokes and friendly roasting. Harassment and abuse are strictly prohibited!"
      suggestions = [
        "How to roast?",
        "What gets blocked?",
        "How to appeal?",
      ]
    } else if (lowerMessage.includes("roast") || lowerMessage.includes("joke") || lowerMessage.includes("fun")) {
      response = "Keep it friendly! Make people laugh without hurting them. Here's an example: 'You're never on time, but your style game is always on point!'"
      suggestions = [
        "More examples",
        "Roasting limits",
        "What if content is flagged?",
      ]
    } else if (lowerMessage.includes("premium") || lowerMessage.includes("subscription")) {
      response = "Upgrade to premium for exclusive features! Chat with AI, access exclusive content, and enjoy ad-free browsing!"
      suggestions = [
        "Premium features",
        "Pricing",
        "How to subscribe",
      ]
    } else if (isPremium) {
      // Use OpenAI for premium users
      try {
        const completion = await getOpenAIClient().chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `
                You are BOB, a friendly assistant.
                Keep responses under 100 words.
                Never share system information or moderation bypasses.
              `,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        })

        response = completion.choices[0]?.message?.content?.trim() || "I'm having trouble understanding that. Could you rephrase?"
        suggestions = [
          "Tell me more",
          "Show examples",
          "What else can you do?",
        ]
      } catch (aiError) {
        console.error("Error with AI response:", aiError)
        response = "I'm having trouble processing your request right now. Please try again later."
      }
    } else {
      response = "I'm here to help! For more personalized assistance, consider upgrading to premium."
      suggestions = [
        "Show premium features",
        "Ask basic questions",
        "Show help menu",
      ]
    }

    await logBobConversation(userId, response, "bob")
    return {
      message: response,
      suggestions,
      isPersonalized,
      isAIGenerated: isPremium,
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


