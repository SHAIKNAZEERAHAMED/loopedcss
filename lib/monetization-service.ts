import { db } from "./firebase/config"
import { ref, set, get, update, push } from "firebase/database"

export interface CreatorProgram {
  id: string
  name: string
  description: string
  requirements: {
    minFollowers: number
    minPosts: number
    minEngagementRate: number
    contentGuidelines: string[]
  }
  benefits: string[]
  payoutStructure: {
    viewPayout: number // Amount per 1000 views
    likePayout: number // Amount per like
    commentPayout: number // Amount per comment
    sharePayout: number // Amount per share
  }
  status: "active" | "inactive"
  createdAt: number
  updatedAt: number
}

export interface CreatorApplication {
  id: string
  userId: string
  userName: string
  programId: string
  status: "pending" | "approved" | "rejected"
  submissionDate: number
  reviewDate?: number
  reviewerNotes?: string
  metrics: {
    followerCount: number
    postCount: number
    engagementRate: number
    contentSafetyScore: number
  }
}

export interface CreatorEarnings {
  userId: string
  totalEarnings: number
  availableBalance: number
  pendingBalance: number
  lastPayout: {
    amount: number
    date: number
    method: string
    status: string
  }
  earningsHistory: {
    [month: string]: {
      views: number
      likes: number
      comments: number
      shares: number
      earnings: number
    }
  }
}

/**
 * Get all available creator programs
 */
export async function getCreatorPrograms(): Promise<CreatorProgram[]> {
  try {
    const programsRef = ref(db, "creator-programs")
    const snapshot = await get(programsRef)

    if (!snapshot.exists()) return []

    const programs: CreatorProgram[] = []
    snapshot.forEach((childSnapshot) => {
      programs.push({
        id: childSnapshot.key as string,
        ...childSnapshot.val(),
      } as CreatorProgram)
    })

    return programs
  } catch (error) {
    console.error("Error getting creator programs:", error)
    return []
  }
}

/**
 * Get a specific creator program by ID
 */
export async function getCreatorProgram(programId: string): Promise<CreatorProgram | null> {
  try {
    const programRef = ref(db, `creator-programs/${programId}`)
    const snapshot = await get(programRef)

    if (!snapshot.exists()) return null

    return {
      id: snapshot.key as string,
      ...snapshot.val(),
    } as CreatorProgram
  } catch (error) {
    console.error("Error getting creator program:", error)
    return null
  }
}

/**
 * Apply for a creator program
 */
export async function applyForCreatorProgram(
  userId: string,
  userName: string,
  programId: string,
  metrics: {
    followerCount: number
    postCount: number
    engagementRate: number
    contentSafetyScore: number
  },
): Promise<CreatorApplication> {
  try {
    const applicationsRef = ref(db, "creator-applications")
    const newApplicationRef = push(applicationsRef)
    const applicationId = newApplicationRef.key as string

    const application: CreatorApplication = {
      id: applicationId,
      userId,
      userName,
      programId,
      status: "pending",
      submissionDate: Date.now(),
      metrics,
    }

    await set(newApplicationRef, application)

    // Also add to user's applications
    await set(ref(db, `users/${userId}/creator-applications/${applicationId}`), true)

    return application
  } catch (error) {
    console.error("Error applying for creator program:", error)
    throw error
  }
}

/**
 * Get a user's creator application
 */
export async function getUserCreatorApplication(userId: string): Promise<CreatorApplication | null> {
  try {
    // Check if user has any applications
    const userAppsRef = ref(db, `users/${userId}/creator-applications`)
    const userAppsSnapshot = await get(userAppsRef)

    if (!userAppsSnapshot.exists()) return null

    // Get the most recent application
    const applicationIds = Object.keys(userAppsSnapshot.val())
    const mostRecentAppId = applicationIds[applicationIds.length - 1]

    // Get the application details
    const appRef = ref(db, `creator-applications/${mostRecentAppId}`)
    const appSnapshot = await get(appRef)

    if (!appSnapshot.exists()) return null

    return {
      id: appSnapshot.key as string,
      ...appSnapshot.val(),
    } as CreatorApplication
  } catch (error) {
    console.error("Error getting user creator application:", error)
    return null
  }
}

/**
 * Get a user's creator earnings
 */
export async function getCreatorEarnings(userId: string): Promise<CreatorEarnings | null> {
  try {
    const earningsRef = ref(db, `creator-earnings/${userId}`)
    const snapshot = await get(earningsRef)

    if (!snapshot.exists()) return null

    return {
      userId,
      ...snapshot.val(),
    } as CreatorEarnings
  } catch (error) {
    console.error("Error getting creator earnings:", error)
    return null
  }
}

/**
 * Initialize creator earnings for a new creator
 */
export async function initializeCreatorEarnings(userId: string): Promise<void> {
  try {
    const earningsRef = ref(db, `creator-earnings/${userId}`)

    const initialEarnings: Omit<CreatorEarnings, "userId"> = {
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0,
      lastPayout: {
        amount: 0,
        date: Date.now(),
        method: "",
        status: "none",
      },
      earningsHistory: {},
    }

    await set(earningsRef, initialEarnings)
  } catch (error) {
    console.error("Error initializing creator earnings:", error)
    throw error
  }
}

/**
 * Update a user's creator earnings based on engagement
 */
export async function updateCreatorEarnings(
  userId: string,
  engagement: {
    views: number
    likes: number
    comments: number
    shares: number
  },
  programId: string,
): Promise<void> {
  try {
    // Get the creator program to determine payout rates
    const program = await getCreatorProgram(programId)
    if (!program) throw new Error("Creator program not found")

    // Get current earnings
    const earningsRef = ref(db, `creator-earnings/${userId}`)
    const snapshot = await get(earningsRef)

    if (!snapshot.exists()) {
      // Initialize earnings if they don't exist
      await initializeCreatorEarnings(userId)
    }

    // Calculate earnings
    const viewEarnings = (engagement.views / 1000) * program.payoutStructure.viewPayout
    const likeEarnings = engagement.likes * program.payoutStructure.likePayout
    const commentEarnings = engagement.comments * program.payoutStructure.commentPayout
    const shareEarnings = engagement.shares * program.payoutStructure.sharePayout

    const totalNewEarnings = viewEarnings + likeEarnings + commentEarnings + shareEarnings

    // Get current date for monthly tracking
    const date = new Date()
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`

    // Update earnings
    const currentEarnings = snapshot.exists() ? (snapshot.val() as CreatorEarnings) : null

    const updates: any = {}

    if (currentEarnings) {
      updates.totalEarnings = currentEarnings.totalEarnings + totalNewEarnings
      updates.pendingBalance = currentEarnings.pendingBalance + totalNewEarnings

      // Update monthly history
      const currentMonthEarnings = currentEarnings.earningsHistory[monthKey] || {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        earnings: 0,
      }

      updates[`earningsHistory/${monthKey}`] = {
        views: currentMonthEarnings.views + engagement.views,
        likes: currentMonthEarnings.likes + engagement.likes,
        comments: currentMonthEarnings.comments + engagement.comments,
        shares: currentMonthEarnings.shares + engagement.shares,
        earnings: currentMonthEarnings.earnings + totalNewEarnings,
      }
    } else {
      updates.totalEarnings = totalNewEarnings
      updates.availableBalance = 0
      updates.pendingBalance = totalNewEarnings
      updates[`earningsHistory/${monthKey}`] = {
        views: engagement.views,
        likes: engagement.likes,
        comments: engagement.comments,
        shares: engagement.shares,
        earnings: totalNewEarnings,
      }
      updates.lastPayout = {
        amount: 0,
        date: Date.now(),
        method: "",
        status: "none",
      }
    }

    await update(earningsRef, updates)
  } catch (error) {
    console.error("Error updating creator earnings:", error)
    throw error
  }
}

/**
 * Process a payout for a creator
 */
export async function processCreatorPayout(userId: string, amount: number, method: string): Promise<void> {
  try {
    const earningsRef = ref(db, `creator-earnings/${userId}`)
    const snapshot = await get(earningsRef)

    if (!snapshot.exists()) throw new Error("Creator earnings not found")

    const earnings = snapshot.val() as CreatorEarnings

    if (earnings.availableBalance < amount) {
      throw new Error("Insufficient available balance")
    }

    const updates = {
      availableBalance: earnings.availableBalance - amount,
      lastPayout: {
        amount,
        date: Date.now(),
        method,
        status: "processed",
      },
    }

    await update(earningsRef, updates)

    // Log the payout
    const payoutLogsRef = ref(db, "payout-logs")
    const newPayoutRef = push(payoutLogsRef)

    await set(newPayoutRef, {
      userId,
      amount,
      method,
      status: "processed",
      date: Date.now(),
    })
  } catch (error) {
    console.error("Error processing creator payout:", error)
    throw error
  }
}


