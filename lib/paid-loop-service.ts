import { db, storage } from "./firebase/config"
import { ref, get, query, orderByChild, equalTo } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { safeGet, safeSet, safeUpdate } from "./db-helpers"
import { hasActiveSubscription, SUBSCRIPTION_TIERS } from "./subscription-service"
import { moderateLoopContent } from "./loop-moderation-service"
import { getUserProfile } from "./user-service"

export interface PaidLoopMetadata {
  title: string
  description: string
  price: number // in cents
  previewImageUrl?: string
  previewVideoUrl?: string
  duration: number // in seconds
  tags: string[]
  category: string
  isExclusive: boolean
  allowComments: boolean
  createdAt: number
  updatedAt: number
  status: "draft" | "pending_review" | "approved" | "rejected"
  moderationSummary?: string
  viewCount: number
  purchaseCount: number
  revenue: number // in cents
}

export interface PaidLoop extends PaidLoopMetadata {
  id: string
  creatorId: string
  creatorName: string
  creatorPhotoUrl?: string
  videoUrl: string
}

export interface PaidLoopPurchase {
  id: string
  userId: string
  loopId: string
  creatorId: string
  price: number // in cents
  platformFee: number // in cents
  creatorEarnings: number // in cents
  purchasedAt: number
  status: "completed" | "refunded" | "failed"
}

/**
 * Create a new paid loop
 */
export async function createPaidLoop(
  userId: string,
  videoFile: File,
  previewImageFile: File | null,
  metadata: Omit<
    PaidLoopMetadata,
    "createdAt" | "updatedAt" | "status" | "viewCount" | "purchaseCount" | "revenue" | "moderationSummary"
  >,
): Promise<{ loopId: string; status: string } | null> {
  try {
    // Check if user has creator subscription
    const hasCreatorSubscription = await hasActiveSubscription(userId, SUBSCRIPTION_TIERS.CREATOR)

    if (!hasCreatorSubscription) {
      throw new Error("Creator subscription required to create paid loops")
    }

    // Generate a unique ID for the loop
    const loopId = uuidv4()

    // Upload the video file
    const videoFileName = `paid_loops/${userId}/${loopId}/video.${videoFile.name.split(".").pop()}`
    const videoFileRef = storageRef(storage, videoFileName)
    await uploadBytes(videoFileRef, videoFile)
    const videoUrl = await getDownloadURL(videoFileRef)

    // Upload the preview image if provided
    let previewImageUrl = undefined
    if (previewImageFile) {
      const imageFileName = `paid_loops/${userId}/${loopId}/preview.${previewImageFile.name.split(".").pop()}`
      const imageFileRef = storageRef(storage, imageFileName)
      await uploadBytes(imageFileRef, previewImageFile)
      previewImageUrl = await getDownloadURL(imageFileRef)
    }

    // Moderate the content
    const moderationResult = await moderateLoopContent(videoFile, userId, {
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
    })

    // Determine initial status based on moderation result
    let status: "draft" | "pending_review" | "approved" | "rejected" = "pending_review"
    let moderationSummary = ""

    if (moderationResult.moderationDecision === "approved") {
      status = "approved"
      moderationSummary = "Content approved automatically. No issues detected."
    } else if (moderationResult.moderationDecision === "rejected") {
      status = "rejected"
      moderationSummary = "Content rejected automatically due to policy violations."
    } else {
      status = "pending_review"
      moderationSummary = "Content is pending human review. It will be available once approved."
    }

    // Get user profile for creator info
    const userProfile = await getUserProfile(userId)

    // Create the paid loop record
    const now = Date.now()
    const paidLoop: PaidLoop = {
      id: loopId,
      creatorId: userId,
      creatorName: userProfile?.displayName || "Unknown Creator",
      creatorPhotoUrl: userProfile?.photoURL,
      videoUrl,
      ...metadata,
      previewImageUrl,
      createdAt: now,
      updatedAt: now,
      status,
      moderationSummary,
      viewCount: 0,
      purchaseCount: 0,
      revenue: 0,
    }

    // Save the paid loop
    await safeSet(`paid_loops/${loopId}`, paidLoop)

    // Add to creator's loops
    await safeSet(`user_paid_loops/${userId}/${loopId}`, {
      id: loopId,
      createdAt: now,
    })

    return { loopId, status }
  } catch (error) {
    console.error("Error creating paid loop:", error)
    return null
  }
}

/**
 * Get a paid loop by ID
 */
export async function getPaidLoop(loopId: string): Promise<PaidLoop | null> {
  try {
    const loop = await safeGet(`paid_loops/${loopId}`)
    return loop
  } catch (error) {
    console.error("Error getting paid loop:", error)
    return null
  }
}

/**
 * Get paid loops by creator
 */
export async function getPaidLoopsByCreator(creatorId: string, limit = 20): Promise<PaidLoop[]> {
  try {
    const userLoopsRef = ref(db, `user_paid_loops/${creatorId}`)
    const snapshot = await get(userLoopsRef)

    if (!snapshot.exists()) return []

    const loopIds = Object.keys(snapshot.val())

    // Get the actual loop data
    const loops: PaidLoop[] = []

    for (const loopId of loopIds.slice(0, limit)) {
      const loop = await getPaidLoop(loopId)
      if (loop && loop.status === "approved") {
        loops.push(loop)
      }
    }

    // Sort by created date (newest first)
    return loops.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error("Error getting paid loops by creator:", error)
    return []
  }
}

/**
 * Purchase a paid loop
 */
export async function purchasePaidLoop(
  userId: string,
  loopId: string,
): Promise<{ success: boolean; purchaseId?: string; message?: string }> {
  try {
    // Get the loop
    const loop = await getPaidLoop(loopId)

    if (!loop) {
      return { success: false, message: "Loop not found" }
    }

    if (loop.status !== "approved") {
      return { success: false, message: "This content is not available for purchase" }
    }

    // Check if user already purchased this loop
    const existingPurchaseRef = query(ref(db, "loop_purchases"), orderByChild("userId"), equalTo(userId))

    const existingPurchaseSnapshot = await get(existingPurchaseRef)

    if (existingPurchaseSnapshot.exists()) {
      const purchases = existingPurchaseSnapshot.val()

      for (const key in purchases) {
        if (purchases[key].loopId === loopId && purchases[key].status === "completed") {
          return {
            success: true,
            purchaseId: key,
            message: "You already own this content",
          }
        }
      }
    }

    // Calculate fees (3% platform fee)
    const price = loop.price
    const platformFee = Math.round(price * 0.03)
    const creatorEarnings = price - platformFee

    // Create purchase record
    const purchaseId = uuidv4()
    const purchase: PaidLoopPurchase = {
      id: purchaseId,
      userId,
      loopId,
      creatorId: loop.creatorId,
      price,
      platformFee,
      creatorEarnings,
      purchasedAt: Date.now(),
      status: "completed",
    }

    // Save the purchase
    await safeSet(`loop_purchases/${purchaseId}`, purchase)

    // Add to user's purchases
    await safeSet(`user_purchases/${userId}/${purchaseId}`, {
      id: purchaseId,
      loopId,
      purchasedAt: purchase.purchasedAt,
    })

    // Update loop stats
    await safeUpdate(`paid_loops/${loopId}`, {
      purchaseCount: loop.purchaseCount + 1,
      revenue: loop.revenue + price,
    })

    // Update creator earnings
    await safeUpdate(`creator_earnings/${loop.creatorId}`, {
      totalEarnings: increment(creatorEarnings),
      pendingEarnings: increment(creatorEarnings),
      totalSales: increment(1),
    })

    return {
      success: true,
      purchaseId,
      message: "Purchase successful! Enjoy the content.",
    }
  } catch (error) {
    console.error("Error purchasing paid loop:", error)
    return { success: false, message: "An error occurred during purchase" }
  }
}

// Helper function to increment a value in Firebase
function increment(amount: number) {
  return {
    ".sv": { increment: amount },
  }
}

/**
 * Check if a user has purchased a loop
 */
export async function hasUserPurchasedLoop(userId: string, loopId: string): Promise<boolean> {
  try {
    const userPurchasesRef = ref(db, `user_purchases/${userId}`)
    const snapshot = await get(userPurchasesRef)

    if (!snapshot.exists()) return false

    const purchases = snapshot.val()

    for (const key in purchases) {
      if (purchases[key].loopId === loopId) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error("Error checking if user purchased loop:", error)
    return false
  }
}

/**
 * Get user's purchased loops
 */
export async function getUserPurchasedLoops(userId: string, limit = 20): Promise<PaidLoop[]> {
  try {
    const userPurchasesRef = ref(db, `user_purchases/${userId}`)
    const snapshot = await get(userPurchasesRef)

    if (!snapshot.exists()) return []

    const purchases = snapshot.val()
    const loopIds = Object.values(purchases).map((p: any) => p.loopId)

    // Get the actual loop data
    const loops: PaidLoop[] = []

    for (const loopId of loopIds.slice(0, limit)) {
      const loop = await getPaidLoop(loopId as string)
      if (loop) {
        loops.push(loop)
      }
    }

    // Sort by purchase date (newest first)
    return loops.sort((a, b) => {
      const purchaseA = Object.values(purchases).find((p: any) => p.loopId === a.id)
      const purchaseB = Object.values(purchases).find((p: any) => p.loopId === b.id)
      return (purchaseB as any).purchasedAt - (purchaseA as any).purchasedAt
    })
  } catch (error) {
    console.error("Error getting user purchased loops:", error)
    return []
  }
}

/**
 * Get creator earnings
 */
export async function getCreatorEarnings(creatorId: string): Promise<{
  totalEarnings: number
  pendingEarnings: number
  paidEarnings: number
  totalSales: number
}> {
  try {
    const earnings = await safeGet(`creator_earnings/${creatorId}`)

    if (!earnings) {
      return {
        totalEarnings: 0,
        pendingEarnings: 0,
        paidEarnings: 0,
        totalSales: 0,
      }
    }

    return earnings
  } catch (error) {
    console.error("Error getting creator earnings:", error)
    return {
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      totalSales: 0,
    }
  }
}

/**
 * Get moderation summary for a loop
 */
export async function getLoopModerationSummary(loopId: string): Promise<string> {
  try {
    const loop = await getPaidLoop(loopId)

    if (!loop) {
      return "Content not found"
    }

    return loop.moderationSummary || "No moderation summary available"
  } catch (error) {
    console.error("Error getting loop moderation summary:", error)
    return "Error retrieving moderation summary"
  }
}


