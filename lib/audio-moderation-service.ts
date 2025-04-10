import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage, db } from "./firebase/config"
import { ref as dbRef, push, set, update } from "firebase/database"
import { v4 as uuidv4 } from "uuid"
import { moderateContent } from "./ai-moderation"

// Interface for audio moderation results
export interface AudioModerationResult {
  isSafe: boolean
  transcript: string
  flaggedContent: {
    abusiveLanguage: string[]
    misinformation: string[]
    unauthorizedApps: string[]
  }
  moderationScore: number
  contextualScore: number
  allowedRoasting: boolean
}

// List of known unauthorized apps that shouldn't be promoted
const UNAUTHORIZED_APPS = [
  "unauthorized-app-1",
  "unauthorized-app-2",
  "banned-app-1",
  "illegal-app",
  // Add more as needed
]

// Keywords that might indicate misinformation
const MISINFORMATION_KEYWORDS = [
  "fake news",
  "conspiracy",
  "government hiding",
  "they don't want you to know",
  "secret cure",
  "miracle treatment",
  "100% guaranteed",
  "scientifically proven",
  // Add more as needed
]

/**
 * Uploads and processes audio for content moderation
 * @param audioFile The audio file to moderate
 * @param userId The ID of the user who uploaded the audio
 * @param contextData Additional context about the content (e.g., post text, loop category)
 */
export async function moderateAudioContent(
  audioFile: File,
  userId: string,
  contextData?: { postText?: string; loopCategory?: string },
): Promise<AudioModerationResult> {
  try {
    // Step 1: Upload the audio file to Firebase Storage
    const fileId = uuidv4()
    const fileExtension = audioFile.name.split(".").pop()
    const fileName = `audio_moderation/${userId}/${fileId}.${fileExtension}`
    const audioRef = ref(storage, fileName)

    await uploadBytes(audioRef, audioFile)
    const audioUrl = await getDownloadURL(audioRef)

    // Step 2: In a real implementation, we would send this audio to a Speech-to-Text service
    // For this demo, we'll simulate transcription with a placeholder function
    const transcript = await simulateTranscription(audioUrl, audioFile.size)

    // Step 3: Moderate the transcribed content
    const moderationResult = await moderateContent(transcript)

    // Step 4: Perform specialized checks for audio content
    const flaggedContent = {
      abusiveLanguage: detectAbusiveLanguage(transcript),
      misinformation: detectMisinformation(transcript),
      unauthorizedApps: detectUnauthorizedApps(transcript),
    }

    // Step 5: Calculate contextual score to determine if this is "healthy roasting" vs. abusive
    const contextualScore = calculateContextualScore(
      transcript,
      contextData?.postText || "",
      contextData?.loopCategory || "",
    )

    // Step 6: Determine if content is safe based on all factors
    const isSafe =
      moderationResult.isSafe &&
      flaggedContent.abusiveLanguage.length === 0 &&
      flaggedContent.misinformation.length === 0 &&
      flaggedContent.unauthorizedApps.length === 0

    // Allow roasting if contextual score is high enough, even if some words might be flagged
    const allowedRoasting =
      contextualScore > 0.7 &&
      flaggedContent.misinformation.length === 0 &&
      flaggedContent.unauthorizedApps.length === 0

    // Step 7: Log the moderation result
    const moderationLogRef = push(dbRef(db, "moderation-logs"))
    await set(moderationLogRef, {
      type: "audio",
      userId,
      audioUrl,
      transcript,
      moderationResult,
      flaggedContent,
      contextualScore,
      timestamp: Date.now(),
      reviewed: false,
      actionTaken: false,
    })

    // Step 8: Return the moderation result
    return {
      isSafe: isSafe || allowedRoasting,
      transcript,
      flaggedContent,
      moderationScore: moderationResult.isSafe ? 1 : 0,
      contextualScore,
      allowedRoasting,
    }
  } catch (error) {
    console.error("Error moderating audio content:", error)
    throw error
  }
}

/**
 * Simulates transcribing audio to text
 * In a real implementation, this would use a service like Google Speech-to-Text
 */
async function simulateTranscription(audioUrl: string, fileSize: number): Promise<string> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Send the audio to a Speech-to-Text API
  // 2. Get back the transcribed text
  // 3. Return the text

  // For demo purposes, we'll return a simulated transcript based on the file size
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

  // Generate different simulated transcripts based on file size to demonstrate different scenarios
  if (fileSize < 100000) {
    // Small file
    return "This is a normal conversation about the latest trends in technology. I think the new smartphone features are really impressive."
  } else if (fileSize < 500000) {
    // Medium file
    return "I disagree with what you're saying. Your opinion is completely wrong and I think you need to reconsider your position. This is healthy debate though, not trying to be mean."
  } else {
    // Large file
    return "This app is terrible! The developers should be fired. I can't believe anyone would use this garbage. Check out this unauthorized app instead, it's much better."
  }
}

/**
 * Detects abusive language in the transcript
 */
function detectAbusiveLanguage(transcript: string): string[] {
  const lowerTranscript = transcript.toLowerCase()

  // List of abusive terms to check for
  // In a real implementation, this would be much more comprehensive
  const abusiveTerms = ["garbage", "terrible", "fired", "stupid", "idiot", "hate", "kill", "attack", "threat"]

  return abusiveTerms.filter((term) => lowerTranscript.includes(term))
}

/**
 * Detects potential misinformation in the transcript
 */
function detectMisinformation(transcript: string): string[] {
  const lowerTranscript = transcript.toLowerCase()

  return MISINFORMATION_KEYWORDS.filter((keyword) => lowerTranscript.includes(keyword.toLowerCase()))
}

/**
 * Detects promotion of unauthorized apps
 */
function detectUnauthorizedApps(transcript: string): string[] {
  const lowerTranscript = transcript.toLowerCase()

  return UNAUTHORIZED_APPS.filter((app) => lowerTranscript.includes(app.toLowerCase()))
}

/**
 * Calculates a contextual score to determine if content is "healthy roasting" vs. abusive
 * Higher score means more likely to be acceptable content
 */
function calculateContextualScore(transcript: string, postText: string, category: string): number {
  // This is a simplified implementation
  // In a real system, you would use more sophisticated NLP techniques

  let score = 0.5 // Start with neutral score

  // Check for indicators of healthy debate/roasting
  if (
    transcript.toLowerCase().includes("just joking") ||
    transcript.toLowerCase().includes("not trying to be mean") ||
    transcript.toLowerCase().includes("healthy debate")
  ) {
    score += 0.2
  }

  // Check for humor indicators
  if (
    transcript.toLowerCase().includes("haha") ||
    transcript.toLowerCase().includes("lol") ||
    transcript.toLowerCase().includes("funny")
  ) {
    score += 0.1
  }

  // If in a comedy or roast category, be more lenient
  if (
    category.toLowerCase().includes("comedy") ||
    category.toLowerCase().includes("roast") ||
    category.toLowerCase().includes("humor")
  ) {
    score += 0.2
  }

  // If the post text provides context that this is humor/roasting
  if (
    postText.toLowerCase().includes("roast") ||
    postText.toLowerCase().includes("joke") ||
    postText.toLowerCase().includes("comedy")
  ) {
    score += 0.1
  }

  // Cap the score at 1.0
  return Math.min(score, 1.0)
}

/**
 * Updates the moderation status of an audio post
 */
export async function updateAudioModerationStatus(
  postId: string,
  status: "approved" | "rejected",
  adminNotes?: string,
): Promise<void> {
  try {
    // Update the post's moderation status
    await update(dbRef(db, `posts/${postId}`), {
      moderationStatus: status,
      adminNotes: adminNotes || "",
      reviewedAt: Date.now(),
    })

    // Update any moderation logs
    // This would require finding the specific log entry for this post
    // In a real implementation, you would store the log ID with the post
  } catch (error) {
    console.error("Error updating audio moderation status:", error)
    throw error
  }
}


