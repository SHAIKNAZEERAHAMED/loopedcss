import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage, db } from "./firebase/config"
import { ref as dbRef, push, set, update, get, query, orderByChild, equalTo } from "firebase/database"
import { v4 as uuidv4 } from "uuid"
import { safeUpdate } from "./db-helpers"

// Interface for loop moderation results
export interface LoopModerationResult {
  isSafe: boolean
  transcript: string
  visualAnalysis: {
    isSafe: boolean
    flaggedContent: {
      inappropriateVisual: string[]
      violentContent: string[]
      sensitiveContent: string[]
    }
    confidenceScore: number
  }
  audioAnalysis: {
    isSafe: boolean
    flaggedContent: {
      abusiveLanguage: string[]
      misinformation: string[]
      unauthorizedApps: string[]
    }
    contextualScore: number
    roastingContext: {
      isRoasting: boolean
      isMutual: boolean
      intensity: "mild" | "moderate" | "severe"
      targetedUsers: string[]
    }
  }
  overallSafetyScore: number
  moderationDecision: "approved" | "pending_review" | "rejected" | "age_restricted"
  feedbackMessage: string
  requiresHumanReview: boolean
  reviewReason?: string
}

/**
 * Uploads and processes loop for content moderation
 * @param loopFile The video file to moderate
 * @param userId The ID of the user who uploaded the loop
 * @param metadata Additional metadata about the content
 * @param mentionedUsers Users mentioned or tagged in the loop
 */
export async function moderateLoopContent(
  loopFile: File,
  userId: string,
  metadata?: {
    title?: string
    description?: string
    tags?: string[]
    isRoasting?: boolean
    targetUsers?: string[]
  },
  mentionedUsers?: string[],
): Promise<LoopModerationResult> {
  try {
    // Step 1: Upload the loop file to Firebase Storage
    const fileId = uuidv4()
    const fileExtension = loopFile.name.split(".").pop()
    const fileName = `loop_moderation/${userId}/${fileId}.${fileExtension}`
    const loopRef = ref(storage, fileName)

    await uploadBytes(loopRef, loopFile)
    const loopUrl = await getDownloadURL(loopRef)

    // Step 2: Extract audio and transcribe
    const transcript = await transcribeLoopAudio(loopUrl, loopFile.size)

    // Step 3: Analyze visual content
    const visualAnalysis = await analyzeLoopVisual(loopUrl)

    // Step 4: Analyze audio content with roasting context
    const audioAnalysis = await analyzeLoopAudio(
      transcript,
      metadata?.isRoasting || false,
      metadata?.targetUsers || mentionedUsers || [],
    )

    // Step 5: Calculate overall safety score
    const overallSafetyScore = calculateOverallSafetyScore(visualAnalysis, audioAnalysis)

    // Step 6: Determine if human review is needed
    const requiresHumanReview = determineIfHumanReviewNeeded(visualAnalysis, audioAnalysis, overallSafetyScore)

    // Step 7: Determine moderation decision
    let moderationDecision: "approved" | "pending_review" | "rejected" | "age_restricted"
    let feedbackMessage = ""
    let reviewReason = ""

    if (overallSafetyScore > 0.8) {
      moderationDecision = "approved"
      feedbackMessage = "This loop is fine! ✅"
    } else if (overallSafetyScore < 0.3) {
      moderationDecision = "rejected"
      feedbackMessage = "This loop crosses our guidelines and may be removed. ❌"
      reviewReason = "Low safety score"
    } else if (requiresHumanReview) {
      moderationDecision = "pending_review"
      feedbackMessage = "Try rewording this to keep it fun and respectful! ⚠️"
      reviewReason = "Borderline content requiring human review"
    } else {
      moderationDecision = "approved"
      feedbackMessage = "This loop is fine! ✅"
    }

    // Step 8: Log the moderation result
    const moderationLogRef = push(dbRef(db, "loop-moderation-logs"))
    await set(moderationLogRef, {
      type: "loop",
      userId,
      loopUrl,
      transcript,
      visualAnalysis,
      audioAnalysis,
      overallSafetyScore,
      moderationDecision,
      requiresHumanReview,
      reviewReason,
      timestamp: Date.now(),
      reviewed: !requiresHumanReview,
      actionTaken: moderationDecision === "rejected",
    })

    // Step 9: Return the moderation result
    const result: LoopModerationResult = {
      isSafe: overallSafetyScore > 0.7,
      transcript,
      visualAnalysis,
      audioAnalysis,
      overallSafetyScore,
      moderationDecision,
      feedbackMessage,
      requiresHumanReview,
      reviewReason,
    }

    // Step 10: Emit real-time notification for moderators if content needs review
    if (requiresHumanReview) {
      // In a real implementation, this would emit a Socket.IO event
      console.log("Emitting real-time moderation notification for human review")
      // socket.emit("new-moderation-item", { type: "loop", id: moderationLogRef.key })
    }

    return result
  } catch (error) {
    console.error("Error moderating loop content:", error)
    throw error
  }
}

/**
 * Transcribes audio from a loop
 */
async function transcribeLoopAudio(loopUrl: string, fileSize: number): Promise<string> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Extract audio from the video
  // 2. Send the audio to a Speech-to-Text API
  // 3. Get back the transcribed text

  await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

  // Generate different simulated transcripts based on file size to demonstrate different scenarios
  if (fileSize < 1000000) {
    // Small file - normal content
    return "Hey everyone! Check out this cool trick I learned. It's pretty awesome, right?"
  } else if (fileSize < 5000000) {
    // Medium file - roasting content
    return "Look at John trying to dance! Bro, you look like a penguin on roller skates! But for real though, you're getting better man."
  } else {
    // Large file - potentially problematic content
    return "This guy is such an idiot. I can't believe anyone would follow this loser. What a waste of space."
  }
}

/**
 * Analyzes visual content in a loop
 */
async function analyzeLoopVisual(loopUrl: string): Promise<LoopModerationResult["visualAnalysis"]> {
  await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API delay

  // Default safe result
  const safeResult: LoopModerationResult["visualAnalysis"] = {
    isSafe: true,
    flaggedContent: {
      inappropriateVisual: [],
      violentContent: [],
      sensitiveContent: [],
    },
    confidenceScore: 0.95,
  }

  // In a real implementation, this would use computer vision APIs to analyze the video frames

  // For demonstration, we'll randomly generate some results
  const random = Math.random()

  if (random < 0.1) {
    // 10% chance of inappropriate content
    return {
      isSafe: false,
      flaggedContent: {
        inappropriateVisual: ["possible_adult_content"],
        violentContent: [],
        sensitiveContent: [],
      },
      confidenceScore: 0.75,
    }
  } else if (random < 0.2) {
    // 10% chance of violent content
    return {
      isSafe: false,
      flaggedContent: {
        inappropriateVisual: [],
        violentContent: ["physical_altercation"],
        sensitiveContent: [],
      },
      confidenceScore: 0.85,
    }
  } else if (random < 0.3) {
    // 10% chance of sensitive content
    return {
      isSafe: true,
      flaggedContent: {
        inappropriateVisual: [],
        violentContent: [],
        sensitiveContent: ["potentially_offensive_gestures"],
      },
      confidenceScore: 0.65,
    }
  }

  return safeResult
}

/**
 * Analyzes audio content from a loop with roasting context
 */
async function analyzeLoopAudio(
  transcript: string,
  isRoastingContext: boolean,
  targetedUsers: string[],
): Promise<LoopModerationResult["audioAnalysis"]> {
  // Default safe result
  const safeResult: LoopModerationResult["audioAnalysis"] = {
    isSafe: true,
    flaggedContent: {
      abusiveLanguage: [],
      misinformation: [],
      unauthorizedApps: [],
    },
    contextualScore: 0.9,
    roastingContext: {
      isRoasting: false,
      isMutual: false,
      intensity: "mild",
      targetedUsers: [],
    },
  }

  // Check for abusive language - with different thresholds for roasting context
  const severeAbusiveTerms = ["idiot", "loser", "waste of space", "hate", "kill", "die"]
  const moderateAbusiveTerms = ["stupid", "dumb", "ugly", "fat", "skinny"]
  const mildAbusiveTerms = ["weird", "awkward", "lame", "cringe"]

  // Roasting-acceptable terms (only allowed in roasting context)
  const roastingTerms = ["penguin on roller skates", "can't dance", "terrible", "awful", "bad at"]

  // Find abusive terms in transcript
  const foundSevereAbusiveTerms = severeAbusiveTerms.filter((term) => transcript.toLowerCase().includes(term))

  const foundModerateAbusiveTerms = moderateAbusiveTerms.filter((term) => transcript.toLowerCase().includes(term))

  const foundMildAbusiveTerms = mildAbusiveTerms.filter((term) => transcript.toLowerCase().includes(term))

  const foundRoastingTerms = roastingTerms.filter((term) => transcript.toLowerCase().includes(term))

  // Determine if this is a roasting context based on content and metadata
  const detectedRoasting =
    foundRoastingTerms.length > 0 || (foundMildAbusiveTerms.length > 0 && targetedUsers.length > 0)

  const isRoasting = isRoastingContext || detectedRoasting

  // Determine roasting intensity
  let roastingIntensity: "mild" | "moderate" | "severe" = "mild"

  if (foundSevereAbusiveTerms.length > 0) {
    roastingIntensity = "severe"
  } else if (foundModerateAbusiveTerms.length > 0) {
    roastingIntensity = "moderate"
  } else if (foundMildAbusiveTerms.length > 0 || foundRoastingTerms.length > 0) {
    roastingIntensity = "mild"
  }

  // Determine abusive language based on context
  let abusiveLanguage: string[] = []

  // Severe terms are never allowed, even in roasting
  abusiveLanguage = [...foundSevereAbusiveTerms]

  // Moderate terms are only allowed in mutual roasting
  if (!isRoasting || roastingIntensity === "severe") {
    abusiveLanguage = [...abusiveLanguage, ...foundModerateAbusiveTerms]
  }

  // Mild terms are allowed in roasting context
  if (!isRoasting) {
    abusiveLanguage = [...abusiveLanguage, ...foundMildAbusiveTerms]
  }

  // Calculate contextual score
  let contextualScore = 0.9

  // Severe terms have a big impact
  if (foundSevereAbusiveTerms.length > 0) {
    contextualScore -= 0.3 * foundSevereAbusiveTerms.length
  }

  // Moderate terms have a medium impact, reduced in roasting context
  if (foundModerateAbusiveTerms.length > 0) {
    const impact = isRoasting ? 0.1 : 0.2
    contextualScore -= impact * foundModerateAbusiveTerms.length
  }

  // Mild terms have a small impact, minimal in roasting context
  if (foundMildAbusiveTerms.length > 0) {
    const impact = isRoasting ? 0.05 : 0.1
    contextualScore -= impact * foundMildAbusiveTerms.length
  }

  // Roasting terms only have an impact outside of roasting context
  if (foundRoastingTerms.length > 0 && !isRoasting) {
    contextualScore -= 0.1 * foundRoastingTerms.length
  }

  // Ensure score is between 0 and 1
  contextualScore = Math.max(0, Math.min(1, contextualScore))

  // Determine if roasting is mutual (in a real implementation, this would check if the targeted users have also roasted the creator)
  const isMutual = isRoasting && Math.random() > 0.3 // Simulated for demo

  return {
    isSafe: contextualScore > 0.6,
    flaggedContent: {
      abusiveLanguage,
      misinformation: [], // Not implemented in this example
      unauthorizedApps: [], // Not implemented in this example
    },
    contextualScore,
    roastingContext: {
      isRoasting,
      isMutual,
      intensity: roastingIntensity,
      targetedUsers,
    },
  }
}

/**
 * Calculates overall safety score based on all analyses
 */
function calculateOverallSafetyScore(
  visualAnalysis: LoopModerationResult["visualAnalysis"],
  audioAnalysis: LoopModerationResult["audioAnalysis"],
): number {
  // Weight factors for different analyses
  const weights = {
    visual: 0.5,
    audio: 0.5,
  }

  // Calculate weighted score
  const visualScore = visualAnalysis.isSafe ? visualAnalysis.confidenceScore : 0.3
  const audioScore = audioAnalysis.isSafe ? audioAnalysis.contextualScore : 0.3

  // Apply roasting context adjustments
  let adjustedAudioScore = audioScore

  if (audioAnalysis.roastingContext.isRoasting) {
    if (audioAnalysis.roastingContext.isMutual) {
      // Mutual roasting gets more leniency
      adjustedAudioScore = Math.min(1, adjustedAudioScore * 1.2)
    } else if (audioAnalysis.roastingContext.intensity === "severe") {
      // Severe non-mutual roasting gets penalized
      adjustedAudioScore = adjustedAudioScore * 0.7
    } else if (audioAnalysis.roastingContext.intensity === "moderate") {
      // Moderate non-mutual roasting gets slightly penalized
      adjustedAudioScore = adjustedAudioScore * 0.9
    }
  }

  const weightedScore = visualScore * weights.visual + adjustedAudioScore * weights.audio

  return weightedScore
}

/**
 * Determines if human review is needed
 */
function determineIfHumanReviewNeeded(
  visualAnalysis: LoopModerationResult["visualAnalysis"],
  audioAnalysis: LoopModerationResult["audioAnalysis"],
  overallSafetyScore: number,
): boolean {
  // Borderline cases that need human review

  // Case 1: Borderline safety score
  if (overallSafetyScore > 0.3 && overallSafetyScore < 0.7) {
    return true
  }

  // Case 2: Roasting context with moderate intensity
  if (
    audioAnalysis.roastingContext.isRoasting &&
    audioAnalysis.roastingContext.intensity === "moderate" &&
    !audioAnalysis.roastingContext.isMutual
  ) {
    return true
  }

  // Case 3: Low confidence in visual analysis
  if (visualAnalysis.confidenceScore < 0.7) {
    return true
  }

  // Case 4: Sensitive content detected
  if (visualAnalysis.flaggedContent.sensitiveContent.length > 0) {
    return true
  }

  return false
}

/**
 * Updates the moderation status of a loop
 */
export async function updateLoopModerationStatus(
  loopId: string,
  status: "approved" | "rejected" | "age_restricted",
  adminNotes?: string,
): Promise<void> {
  try {
    // Update the loop's moderation status
    await safeUpdate(`loops/${loopId}`, {
      moderationStatus: status,
      adminNotes: adminNotes || "",
      reviewedAt: Date.now(),
    })

    // Update any moderation logs
    const logsRef = query(dbRef(db, "loop-moderation-logs"), orderByChild("loopId"), equalTo(loopId))

    const snapshot = await get(logsRef)
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        update(dbRef(db, `loop-moderation-logs/${childSnapshot.key}`), {
          reviewed: true,
          reviewResult: status,
          reviewedAt: Date.now(),
          adminNotes: adminNotes || "",
        })
      })
    }
  } catch (error) {
    console.error("Error updating loop moderation status:", error)
    throw error
  }
}

/**
 * Gets all pending moderation items
 */
export async function getPendingLoopModerationItems(limit = 20): Promise<any[]> {
  try {
    const logsRef = dbRef(db, "loop-moderation-logs")
    const snapshot = await get(logsRef)

    if (!snapshot.exists()) return []

    const items: any[] = []

    snapshot.forEach((childSnapshot) => {
      const item = childSnapshot.val()
      item.id = childSnapshot.key

      // Only include items that require human review
      if (item.requiresHumanReview && !item.reviewed) {
        items.push(item)
      }
    })

    // Sort by timestamp (newest first) and limit
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit)
  } catch (error) {
    console.error("Error getting pending moderation items:", error)
    return []
  }
}


