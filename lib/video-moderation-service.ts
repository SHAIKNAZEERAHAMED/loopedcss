import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage, db } from "./firebase/config"
import { ref as dbRef, push, set, update, get, query, orderByChild, equalTo } from "firebase/database"
import { v4 as uuidv4 } from "uuid"
import { safeUpdate } from "./db-helpers"

// Interface for video moderation results
export interface VideoModerationResult {
  isSafe: boolean
  transcript: string
  visualAnalysis: {
    isSafe: boolean
    flaggedContent: {
      inappropriateVisual: string[]
      violentContent: string[]
      sensitiveContent: string[]
      lowQualityContent: boolean
      awkwardExpressions: boolean
      excessiveExaggeration: boolean
    }
    confidenceScore: number
  }
  audioAnalysis: {
    isSafe: boolean
    flaggedContent: {
      abusiveLanguage: string[]
      misinformation: string[]
      unauthorizedApps: string[]
      forcedHumor: boolean
      awkwardPhrases: string[]
      embarrassingSpeechPatterns: boolean
    }
    contextualScore: number
  }
  metadataAnalysis: {
    isSafe: boolean
    flaggedContent: {
      inappropriateTags: string[]
      misleadingTitle: boolean
      clickbaitScore: number
    }
  }
  ageRestriction: {
    isRestricted: boolean
    minimumAge: number
    reason: string
  }
  overallSafetyScore: number
  moderationDecision: "approved" | "pending" | "rejected" | "age_restricted"
  cringe: {
    isCringe: boolean
    cringeScore: number
    cringeFactors: string[]
  }
}

/**
 * Uploads and processes video for content moderation
 * @param videoFile The video file to moderate
 * @param userId The ID of the user who uploaded the video
 * @param metadata Additional metadata about the content (title, description, tags)
 */
export async function moderateVideoContent(
  videoFile: File,
  userId: string,
  metadata?: {
    title?: string
    description?: string
    tags?: string[]
    isChildContent?: boolean
  },
): Promise<VideoModerationResult> {
  try {
    // Step 1: Upload the video file to Firebase Storage
    const fileId = uuidv4()
    const fileExtension = videoFile.name.split(".").pop()
    const fileName = `video_moderation/${userId}/${fileId}.${fileExtension}`
    const videoRef = ref(storage, fileName)

    await uploadBytes(videoRef, videoFile)
    const videoUrl = await getDownloadURL(videoRef)

    // Step 2: In a real implementation, we would:
    // - Extract audio from the video
    // - Transcribe the audio to text
    // - Analyze the video frames for visual content
    // For this demo, we'll simulate these processes

    // Simulate audio transcription
    const transcript = await simulateTranscription(videoUrl, videoFile.size)

    // Simulate visual content analysis
    const visualAnalysis = await simulateVisualAnalysis(videoUrl, videoFile.size, metadata?.isChildContent)

    // Simulate audio content analysis
    const audioAnalysis = await simulateAudioAnalysis(transcript, metadata?.isChildContent)

    // Analyze metadata (title, description, tags)
    const metadataAnalysis = analyzeMetadata(metadata)

    // Determine age restriction
    const ageRestriction = determineAgeRestriction(visualAnalysis, audioAnalysis, metadataAnalysis)

    // Calculate overall safety score (0-1, higher is safer)
    const overallSafetyScore = calculateOverallSafetyScore(visualAnalysis, audioAnalysis, metadataAnalysis)

    // Determine cringe factor
    const cringeAnalysis = analyzeCringeFactor(visualAnalysis, audioAnalysis, transcript, metadata)

    // Determine moderation decision
    let moderationDecision: "approved" | "pending" | "rejected" | "age_restricted" = "pending"

    if (overallSafetyScore > 0.8 && !ageRestriction.isRestricted) {
      moderationDecision = "approved"
    } else if (
      overallSafetyScore < 0.3 ||
      visualAnalysis.flaggedContent.violentContent.length > 0 ||
      audioAnalysis.flaggedContent.abusiveLanguage.length > 3
    ) {
      moderationDecision = "rejected"
    } else if (ageRestriction.isRestricted) {
      moderationDecision = "age_restricted"
    }

    // Step 3: Log the moderation result
    const moderationLogRef = push(dbRef(db, "moderation-logs"))
    await set(moderationLogRef, {
      type: "video",
      userId,
      videoUrl,
      transcript,
      visualAnalysis,
      audioAnalysis,
      metadataAnalysis,
      ageRestriction,
      overallSafetyScore,
      moderationDecision,
      cringe: cringeAnalysis,
      timestamp: Date.now(),
      reviewed: false,
      actionTaken: false,
    })

    // Step 4: Return the moderation result
    const result: VideoModerationResult = {
      isSafe: overallSafetyScore > 0.7,
      transcript,
      visualAnalysis,
      audioAnalysis,
      metadataAnalysis,
      ageRestriction,
      overallSafetyScore,
      moderationDecision,
      cringe: cringeAnalysis,
    }

    // Step 5: Emit real-time notification for moderators if content needs review
    if (moderationDecision === "pending" || moderationDecision === "rejected") {
      // In a real implementation, this would emit a Socket.IO event
      console.log("Emitting real-time moderation notification")
      // socket.emit("new-moderation-item", { type: "video", id: moderationLogRef.key })
    }

    return result
  } catch (error) {
    console.error("Error moderating video content:", error)
    throw error
  }
}

/**
 * Simulates transcribing audio from video to text
 * In a real implementation, this would use a service like Google Speech-to-Text
 */
async function simulateTranscription(videoUrl: string, fileSize: number): Promise<string> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Extract audio from the video
  // 2. Send the audio to a Speech-to-Text API
  // 3. Get back the transcribed text

  await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay

  // Generate different simulated transcripts based on file size to demonstrate different scenarios
  if (fileSize < 1000000) {
    // Small file
    return "This is a normal video about the latest trends in technology. I think the new smartphone features are really impressive."
  } else if (fileSize < 5000000) {
    // Medium file
    return "Hey guys! What's up? Don't forget to smash that like button and subscribe! Today we're going to do something CRAZY! You won't believe what happens next! This is going to be epic!"
  } else {
    // Large file
    return "This app is terrible! The developers should be fired. I can't believe anyone would use this garbage. Check out this unauthorized app instead, it's much better."
  }
}

/**
 * Simulates analyzing visual content in a video
 * In a real implementation, this would use computer vision APIs
 */
async function simulateVisualAnalysis(
  videoUrl: string,
  fileSize: number,
  isChildContent?: boolean,
): Promise<VideoModerationResult["visualAnalysis"]> {
  await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate API delay

  // Default safe result
  const safeResult: VideoModerationResult["visualAnalysis"] = {
    isSafe: true,
    flaggedContent: {
      inappropriateVisual: [],
      violentContent: [],
      sensitiveContent: [],
      lowQualityContent: false,
      awkwardExpressions: false,
      excessiveExaggeration: false,
    },
    confidenceScore: 0.95,
  }

  // Simulate different results based on file size
  if (fileSize > 10000000) {
    // Very large file - simulate unsafe content
    return {
      isSafe: false,
      flaggedContent: {
        inappropriateVisual: ["possible_adult_content"],
        violentContent: [],
        sensitiveContent: ["suggestive_imagery"],
        lowQualityContent: false,
        awkwardExpressions: false,
        excessiveExaggeration: false,
      },
      confidenceScore: 0.82,
    }
  } else if (fileSize > 5000000) {
    // Large file - simulate cringe content
    return {
      isSafe: true,
      flaggedContent: {
        inappropriateVisual: [],
        violentContent: [],
        sensitiveContent: [],
        lowQualityContent: true,
        awkwardExpressions: true,
        excessiveExaggeration: true,
      },
      confidenceScore: 0.78,
    }
  } else if (isChildContent) {
    // Child content - extra scrutiny
    // Randomly flag some child content for demonstration
    const random = Math.random()
    if (random > 0.7) {
      return {
        isSafe: false,
        flaggedContent: {
          inappropriateVisual: [],
          violentContent: [],
          sensitiveContent: ["child_safety_concern"],
          lowQualityContent: true,
          awkwardExpressions: false,
          excessiveExaggeration: false,
        },
        confidenceScore: 0.65,
      }
    }
  }

  return safeResult
}

/**
 * Simulates analyzing audio content from a video
 */
async function simulateAudioAnalysis(
  transcript: string,
  isChildContent?: boolean,
): Promise<VideoModerationResult["audioAnalysis"]> {
  // Default safe result
  const safeResult: VideoModerationResult["audioAnalysis"] = {
    isSafe: true,
    flaggedContent: {
      abusiveLanguage: [],
      misinformation: [],
      unauthorizedApps: [],
      forcedHumor: false,
      awkwardPhrases: [],
      embarrassingSpeechPatterns: false,
    },
    contextualScore: 0.9,
  }

  // Check for abusive language
  const abusiveTerms = ["garbage", "terrible", "fired", "stupid", "idiot", "hate"]
  const foundAbusiveTerms = abusiveTerms.filter((term) => transcript.toLowerCase().includes(term))

  // Check for misinformation keywords
  const misinfoTerms = ["fake news", "conspiracy", "they don't want you to know", "secret cure"]
  const foundMisinfoTerms = misinfoTerms.filter((term) => transcript.toLowerCase().includes(term))

  // Check for unauthorized apps
  const unauthorizedApps = ["unauthorized-app", "banned-app", "illegal-app"]
  const foundUnauthorizedApps = unauthorizedApps.filter((app) => transcript.toLowerCase().includes(app))

  // Check for cringe indicators
  const forcedHumor =
    transcript.includes("CRAZY") || transcript.includes("epic") || transcript.includes("smash that like button")

  const awkwardPhrases = ["what's up guys", "don't forget to subscribe", "you won't believe"].filter((phrase) =>
    transcript.toLowerCase().includes(phrase.toLowerCase()),
  )

  const embarrassingSpeechPatterns = transcript.includes("!") && transcript.split("!").length > 3

  // Calculate contextual score
  let contextualScore = 0.9
  if (foundAbusiveTerms.length > 0) contextualScore -= 0.2 * foundAbusiveTerms.length
  if (foundMisinfoTerms.length > 0) contextualScore -= 0.3 * foundMisinfoTerms.length
  if (foundUnauthorizedApps.length > 0) contextualScore -= 0.4 * foundUnauthorizedApps.length
  if (forcedHumor) contextualScore -= 0.1
  if (awkwardPhrases.length > 0) contextualScore -= 0.05 * awkwardPhrases.length
  if (embarrassingSpeechPatterns) contextualScore -= 0.1

  // Apply stricter standards for child content
  if (isChildContent) {
    contextualScore -= 0.1 * foundAbusiveTerms.length
  }

  // Ensure score is between 0 and 1
  contextualScore = Math.max(0, Math.min(1, contextualScore))

  return {
    isSafe: contextualScore > 0.6,
    flaggedContent: {
      abusiveLanguage: foundAbusiveTerms,
      misinformation: foundMisinfoTerms,
      unauthorizedApps: foundUnauthorizedApps,
      forcedHumor,
      awkwardPhrases,
      embarrassingSpeechPatterns,
    },
    contextualScore,
  }
}

/**
 * Analyzes video metadata (title, description, tags)
 */
function analyzeMetadata(metadata?: {
  title?: string
  description?: string
  tags?: string[]
}): VideoModerationResult["metadataAnalysis"] {
  if (!metadata) {
    return {
      isSafe: true,
      flaggedContent: {
        inappropriateTags: [],
        misleadingTitle: false,
        clickbaitScore: 0,
      },
    }
  }

  // Check for inappropriate tags
  const inappropriateTags: string[] = []
  if (metadata.tags) {
    const bannedTags = ["nsfw", "adult", "xxx", "violence", "hate"]
    bannedTags.forEach((tag) => {
      if (metadata.tags?.some((t) => t.toLowerCase().includes(tag))) {
        inappropriateTags.push(tag)
      }
    })
  }

  // Check for misleading title
  let misleadingTitle = false
  let clickbaitScore = 0

  if (metadata.title) {
    const clickbaitPhrases = [
      "you won't believe",
      "shocking",
      "mind blowing",
      "doctors hate",
      "this will change",
      "secret",
      "they don't want you to know",
      "hack",
      "trick",
      "!!!",
    ]

    clickbaitPhrases.forEach((phrase) => {
      if (metadata.title?.toLowerCase().includes(phrase)) {
        clickbaitScore += 0.1
      }
    })

    // Check for ALL CAPS
    if (metadata.title === metadata.title.toUpperCase() && metadata.title.length > 10) {
      clickbaitScore += 0.2
    }

    // Check for excessive punctuation
    if ((metadata.title.match(/!/g) || []).length > 2) {
      clickbaitScore += 0.1
    }

    // Cap at 1.0
    clickbaitScore = Math.min(1.0, clickbaitScore)

    // Determine if title is misleading
    misleadingTitle = clickbaitScore > 0.3
  }

  return {
    isSafe: inappropriateTags.length === 0 && !misleadingTitle,
    flaggedContent: {
      inappropriateTags,
      misleadingTitle,
      clickbaitScore,
    },
  }
}

/**
 * Determines if content should be age-restricted
 */
function determineAgeRestriction(
  visualAnalysis: VideoModerationResult["visualAnalysis"],
  audioAnalysis: VideoModerationResult["audioAnalysis"],
  metadataAnalysis: VideoModerationResult["metadataAnalysis"],
): VideoModerationResult["ageRestriction"] {
  // Default - not restricted
  const notRestricted = {
    isRestricted: false,
    minimumAge: 0,
    reason: "",
  }

  // Check for adult content
  if (
    visualAnalysis.flaggedContent.inappropriateVisual.includes("possible_adult_content") ||
    visualAnalysis.flaggedContent.sensitiveContent.includes("suggestive_imagery")
  ) {
    return {
      isRestricted: true,
      minimumAge: 18,
      reason: "Adult or suggestive content",
    }
  }

  // Check for violent content
  if (visualAnalysis.flaggedContent.violentContent.length > 0) {
    return {
      isRestricted: true,
      minimumAge: 16,
      reason: "Violent content",
    }
  }

  // Check for abusive language
  if (audioAnalysis.flaggedContent.abusiveLanguage.length > 1) {
    return {
      isRestricted: true,
      minimumAge: 13,
      reason: "Strong language",
    }
  }

  // Check for inappropriate tags
  if (metadataAnalysis.flaggedContent.inappropriateTags.length > 0) {
    return {
      isRestricted: true,
      minimumAge: 18,
      reason: "Inappropriate content tags",
    }
  }

  return notRestricted
}

/**
 * Calculates overall safety score based on all analyses
 */
function calculateOverallSafetyScore(
  visualAnalysis: VideoModerationResult["visualAnalysis"],
  audioAnalysis: VideoModerationResult["audioAnalysis"],
  metadataAnalysis: VideoModerationResult["metadataAnalysis"],
): number {
  // Weight factors for different analyses
  const weights = {
    visual: 0.4,
    audio: 0.4,
    metadata: 0.2,
  }

  // Calculate weighted score
  const visualScore = visualAnalysis.isSafe ? visualAnalysis.confidenceScore : 0
  const audioScore = audioAnalysis.isSafe ? audioAnalysis.contextualScore : 0
  const metadataScore = metadataAnalysis.isSafe ? 1 : 0.5 - metadataAnalysis.flaggedContent.clickbaitScore

  const weightedScore = visualScore * weights.visual + audioScore * weights.audio + metadataScore * weights.metadata

  return weightedScore
}

/**
 * Analyzes content for "cringe" factors
 */
function analyzeCringeFactor(
  visualAnalysis: VideoModerationResult["visualAnalysis"],
  audioAnalysis: VideoModerationResult["audioAnalysis"],
  transcript: string,
  metadata?: { title?: string; description?: string; tags?: string[] },
): VideoModerationResult["cringe"] {
  let cringeScore = 0
  const cringeFactors: string[] = []

  // Check visual factors
  if (visualAnalysis.flaggedContent.awkwardExpressions) {
    cringeScore += 0.2
    cringeFactors.push("awkward_expressions")
  }

  if (visualAnalysis.flaggedContent.excessiveExaggeration) {
    cringeScore += 0.2
    cringeFactors.push("excessive_exaggeration")
  }

  if (visualAnalysis.flaggedContent.lowQualityContent) {
    cringeScore += 0.1
    cringeFactors.push("low_quality_content")
  }

  // Check audio factors
  if (audioAnalysis.flaggedContent.forcedHumor) {
    cringeScore += 0.2
    cringeFactors.push("forced_humor")
  }

  if (audioAnalysis.flaggedContent.awkwardPhrases.length > 0) {
    cringeScore += 0.1 * audioAnalysis.flaggedContent.awkwardPhrases.length
    cringeFactors.push("awkward_phrases")
  }

  if (audioAnalysis.flaggedContent.embarrassingSpeechPatterns) {
    cringeScore += 0.2
    cringeFactors.push("embarrassing_speech_patterns")
  }

  // Check metadata
  if (metadata?.title) {
    // Check for excessive emojis
    const emojiCount = (metadata.title.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g) || []).length
    if (emojiCount > 3) {
      cringeScore += 0.1
      cringeFactors.push("excessive_emojis")
    }

    // Check for ALL CAPS title
    if (metadata.title === metadata.title.toUpperCase() && metadata.title.length > 10) {
      cringeScore += 0.1
      cringeFactors.push("all_caps_title")
    }
  }

  // Check for cringe-related tags
  if (metadata?.tags) {
    const cringeTags = ["challenge", "prank", "gone wrong", "reaction"]
    const foundCringeTags = cringeTags.filter((tag) =>
      metadata.tags?.some((t) => t.toLowerCase().includes(tag.toLowerCase())),
    )

    if (foundCringeTags.length > 0) {
      cringeScore += 0.1 * foundCringeTags.length
      cringeFactors.push("cringe_tags")
    }
  }

  // Cap score at 1.0
  cringeScore = Math.min(1.0, cringeScore)

  return {
    isCringe: cringeScore > 0.4,
    cringeScore,
    cringeFactors,
  }
}

/**
 * Updates the moderation status of a video post
 */
export async function updateVideoModerationStatus(
  postId: string,
  status: "approved" | "rejected" | "age_restricted",
  adminNotes?: string,
): Promise<void> {
  try {
    // Update the post's moderation status
    await safeUpdate(`posts/${postId}`, {
      moderationStatus: status,
      adminNotes: adminNotes || "",
      reviewedAt: Date.now(),
    })

    // Update any moderation logs
    // This would require finding the specific log entry for this post
    const logsRef = query(dbRef(db, "moderation-logs"), orderByChild("postId"), equalTo(postId))

    const snapshot = await get(logsRef)
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        update(dbRef(db, `moderation-logs/${childSnapshot.key}`), {
          reviewed: true,
          reviewResult: status,
          reviewedAt: Date.now(),
          adminNotes: adminNotes || "",
        })
      })
    }
  } catch (error) {
    console.error("Error updating video moderation status:", error)
    throw error
  }
}

/**
 * Gets all pending moderation items
 */
export async function getPendingModerationItems(type?: "video" | "audio" | "text", limit = 20): Promise<any[]> {
  try {
    const logsRef = dbRef(db, "moderation-logs")
    const snapshot = await get(logsRef)

    if (!snapshot.exists()) return []

    const items: any[] = []

    snapshot.forEach((childSnapshot) => {
      const item = childSnapshot.val()
      item.id = childSnapshot.key

      // Filter by type and reviewed status
      if ((!type || item.type === type) && !item.reviewed) {
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


