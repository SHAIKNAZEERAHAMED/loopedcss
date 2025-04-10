import { ref, get, set, update, query, orderByChild, equalTo } from "firebase/database"
import { db } from "./firebase/config"
import { safePush } from "./db-helpers"

interface DMSafetyReport {
  reporterId: string
  reportedUserId: string
  reason: string
  timestamp: number
  status: "pending" | "reviewed" | "dismissed"
  evidence?: {
    messageIds: string[]
    screenshots?: string[]
  }
}

interface DMSafetyStatus {
  userId: string
  reportCount: number
  dmRequestCount: number
  dmRequestFrequency: number // requests per day
  lastReportedAt?: number
  lastDMRequestAt?: number
  suspensionHistory: {
    startDate: number
    endDate: number
    reason: string
  }[]
  isSuspended: boolean
  suspensionEndDate?: number
  safetyScore: number // 0-1, higher is safer
  isUnderSuspicion: boolean
}

/**
 * Reports a user for inappropriate DM requests
 */
export async function reportUserForDMs(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  evidence?: {
    messageIds: string[]
    screenshots?: string[]
  },
): Promise<void> {
  try {
    // Create the report
    const report: DMSafetyReport = {
      reporterId,
      reportedUserId,
      reason,
      timestamp: Date.now(),
      status: "pending",
      evidence,
    }

    // Save the report
    await safePush(`dm-safety-reports`, report)

    // Update the user's safety status
    await updateUserSafetyStatus(reportedUserId)

    // Log the moderation event
    await safePush("moderation-logs", {
      type: "user",
      userId: reportedUserId,
      reporterId,
      reason,
      timestamp: Date.now(),
      reviewed: false,
      actionTaken: false,
    })
  } catch (error) {
    console.error("Error reporting user for DMs:", error)
    throw error
  }
}

/**
 * Records a DM request from one user to another
 */
export async function recordDMRequest(senderId: string, recipientId: string): Promise<void> {
  try {
    // Record the DM request
    await safePush(`users/${recipientId}/dm-requests`, {
      senderId,
      timestamp: Date.now(),
      status: "pending", // pending, accepted, rejected
    })

    // Update the sender's safety status
    await updateUserSafetyStatus(senderId)
  } catch (error) {
    console.error("Error recording DM request:", error)
    throw error
  }
}

/**
 * Updates a user's safety status based on reports and DM request activity
 */
export async function updateUserSafetyStatus(userId: string): Promise<DMSafetyStatus> {
  try {
    // Get current safety status or create new one
    const statusRef = ref(db, `users/${userId}/safety-status`)
    const statusSnapshot = await get(statusRef)

    let status: DMSafetyStatus

    if (statusSnapshot.exists()) {
      status = statusSnapshot.val() as DMSafetyStatus
    } else {
      status = {
        userId,
        reportCount: 0,
        dmRequestCount: 0,
        dmRequestFrequency: 0,
        suspensionHistory: [],
        isSuspended: false,
        safetyScore: 1.0,
        isUnderSuspicion: false,
      }
    }

    // Count reports against this user
    const reportsRef = query(ref(db, "dm-safety-reports"), orderByChild("reportedUserId"), equalTo(userId))

    const reportsSnapshot = await get(reportsRef)
    const reportCount = reportsSnapshot.exists() ? Object.keys(reportsSnapshot.val()).length : 0

    // Count DM requests from this user
    const dmRequestsRef = ref(db, `users/${userId}/sent-dm-requests`)
    const dmRequestsSnapshot = await get(dmRequestsRef)
    const dmRequestCount = dmRequestsSnapshot.exists() ? Object.keys(dmRequestsSnapshot.val()).length : 0

    // Calculate DM request frequency (requests per day)
    // For simplicity, we'll use a 30-day window
    const now = Date.now()
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    let recentRequestCount = 0

    if (dmRequestsSnapshot.exists()) {
      Object.values(dmRequestsSnapshot.val()).forEach((request: any) => {
        if (request.timestamp > thirtyDaysAgo) {
          recentRequestCount++
        }
      })
    }

    const dmRequestFrequency = recentRequestCount / 30

    // Update status
    status.reportCount = reportCount
    status.dmRequestCount = dmRequestCount
    status.dmRequestFrequency = dmRequestFrequency
    status.lastReportedAt = now

    // Determine if user should be under suspicion
    // A user is under suspicion if they have 3+ reports or send more than 5 DM requests per day
    status.isUnderSuspicion = reportCount >= 3 || dmRequestFrequency > 5

    // Calculate safety score
    // Lower score means higher risk
    let safetyScore = 1.0

    if (reportCount > 0) {
      safetyScore -= 0.1 * Math.min(reportCount, 5) // Max penalty of 0.5 for reports
    }

    if (dmRequestFrequency > 1) {
      safetyScore -= 0.05 * Math.min(dmRequestFrequency, 10) // Max penalty of 0.5 for frequency
    }

    if (status.suspensionHistory.length > 0) {
      safetyScore -= 0.1 * status.suspensionHistory.length // Penalty for previous suspensions
    }

    status.safetyScore = Math.max(0, safetyScore)

    // Check if user should be suspended
    // Auto-suspend if safety score is very low or they have 5+ reports
    if ((status.safetyScore < 0.3 || reportCount >= 5) && !status.isSuspended) {
      // Suspend for 30 days
      const suspensionEndDate = now + 30 * 24 * 60 * 60 * 1000

      status.isSuspended = true
      status.suspensionEndDate = suspensionEndDate
      status.suspensionHistory.push({
        startDate: now,
        endDate: suspensionEndDate,
        reason: "Excessive DM requests and user reports",
      })

      // Log suspension
      await safePush("moderation-logs", {
        type: "user",
        userId,
        action: "suspended",
        reason: "Excessive DM requests and user reports",
        duration: "30 days",
        timestamp: now,
        reviewed: true,
        actionTaken: true,
      })
    }

    // Save updated status
    await set(statusRef, status)

    return status
  } catch (error) {
    console.error("Error updating user safety status:", error)
    throw error
  }
}

/**
 * Checks if a user is allowed to send DM requests
 */
export async function canSendDMRequests(userId: string): Promise<{
  allowed: boolean
  reason?: string
  suspensionEndDate?: number
}> {
  try {
    // Get user's safety status
    const statusRef = ref(db, `users/${userId}/safety-status`)
    const statusSnapshot = await get(statusRef)

    if (!statusSnapshot.exists()) {
      return { allowed: true }
    }

    const status = statusSnapshot.val() as DMSafetyStatus

    // Check if user is suspended
    if (status.isSuspended) {
      // Check if suspension has ended
      if (status.suspensionEndDate && status.suspensionEndDate < Date.now()) {
        // Suspension has ended, update status
        await update(statusRef, {
          isSuspended: false,
          suspensionEndDate: null,
        })

        return { allowed: true }
      }

      return {
        allowed: false,
        reason: "Your account is temporarily suspended from sending DM requests",
        suspensionEndDate: status.suspensionEndDate,
      }
    }

    // Check if user is under rate limiting
    if (status.dmRequestFrequency > 10) {
      return {
        allowed: false,
        reason: "You have reached the daily limit for DM requests. Please try again tomorrow.",
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error("Error checking if user can send DM requests:", error)
    return { allowed: true } // Default to allowed in case of error
  }
}

/**
 * Gets all users under suspicion for DM harassment
 */
export async function getUsersUnderSuspicion(): Promise<DMSafetyStatus[]> {
  try {
    const users: DMSafetyStatus[] = []

    // Query all users
    const usersRef = ref(db, "users")
    const usersSnapshot = await get(usersRef)

    if (!usersSnapshot.exists()) {
      return []
    }

    // Check each user's safety status
    usersSnapshot.forEach((userSnapshot) => {
      const userData = userSnapshot.val()

      if (userData["safety-status"] && userData["safety-status"].isUnderSuspicion) {
        users.push(userData["safety-status"])
      }
    })

    return users
  } catch (error) {
    console.error("Error getting users under suspicion:", error)
    return []
  }
}

/**
 * Gets all DM safety reports
 */
export async function getDMSafetyReports(status?: "pending" | "reviewed" | "dismissed"): Promise<DMSafetyReport[]> {
  try {
    const reportsRef = ref(db, "dm-safety-reports")
    const reportsSnapshot = await get(reportsRef)

    if (!reportsSnapshot.exists()) {
      return []
    }

    const reports: DMSafetyReport[] = []

    reportsSnapshot.forEach((reportSnapshot) => {
      const report = reportSnapshot.val() as DMSafetyReport

      if (!status || report.status === status) {
        reports.push({
          ...report,
          id: reportSnapshot.key,
        } as DMSafetyReport)
      }
    })

    // Sort by timestamp (newest first)
    return reports.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error getting DM safety reports:", error)
    return []
  }
}

/**
 * Updates the status of a DM safety report
 */
export async function updateDMSafetyReportStatus(
  reportId: string,
  status: "reviewed" | "dismissed",
  notes?: string,
): Promise<void> {
  try {
    await update(ref(db, `dm-safety-reports/${reportId}`), {
      status,
      reviewedAt: Date.now(),
      reviewNotes: notes,
    })
  } catch (error) {
    console.error("Error updating DM safety report status:", error)
    throw error
  }
}


