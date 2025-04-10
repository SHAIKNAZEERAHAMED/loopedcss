import { ref, get, query, orderByChild, limitToLast, startAt, endAt } from "firebase/database"
import { db } from "./firebase/config"

/**
 * Gets analytics data for a user
 */
export async function getUserAnalytics(userId: string): Promise<any> {
  try {
    // Get user posts
    const postsRef = ref(db, "posts")
    const postsQuery = query(postsRef, orderByChild("userId"), startAt(userId), endAt(userId + "\uf8ff"))
    const postsSnapshot = await get(postsQuery)

    const posts = []
    let totalLikes = 0
    let totalComments = 0
    let totalShares = 0

    if (postsSnapshot.exists()) {
      const postsData = postsSnapshot.val()

      for (const postId in postsData) {
        const post = postsData[postId]
        posts.push(post)

        totalLikes += post.likesCount || 0
        totalComments += post.commentsCount || 0
        totalShares += post.sharesCount || 0
      }
    }

    // Get user followers
    const followersRef = ref(db, `followers/${userId}`)
    const followersSnapshot = await get(followersRef)
    const followersCount = followersSnapshot.exists() ? Object.keys(followersSnapshot.val()).length : 0

    // Get user following
    const followingRef = ref(db, `following/${userId}`)
    const followingSnapshot = await get(followingRef)
    const followingCount = followingSnapshot.exists() ? Object.keys(followingSnapshot.val()).length : 0

    // Calculate engagement
    const totalEngagement = totalLikes + totalComments + totalShares

    // Generate mock growth data
    const postsGrowth = Math.floor(Math.random() * 20) - 5 // -5% to +15%
    const followersGrowth = Math.floor(Math.random() * 25) // 0% to +25%
    const engagementGrowth = Math.floor(Math.random() * 30) - 10 // -10% to +20%

    // Return analytics data
    return {
      totalPosts: posts.length,
      totalFollowers: followersCount,
      totalFollowing: followingCount,
      totalLikes,
      totalComments,
      totalShares,
      totalEngagement,
      postsGrowth,
      followersGrowth,
      engagementGrowth,
      // Add ML model accuracy data
      mlAccuracy: {
        contentModerationTelugu: 94.8,
        contentModerationEnglish: 97.2,
        imageAnalysis: 92.5,
        videoAnalysis: 89.7,
        recommendationEngine: 95.3,
      },
    }
  } catch (error) {
    console.error("Error getting user analytics:", error)
    return null
  }
}

/**
 * Gets platform-wide analytics data
 */
export async function getPlatformAnalytics(): Promise<any> {
  try {
    // Get total users
    const usersRef = ref(db, "users")
    const usersSnapshot = await get(usersRef)
    const totalUsers = usersSnapshot.exists() ? Object.keys(usersSnapshot.val()).length : 0

    // Get total posts
    const postsRef = ref(db, "posts")
    const postsSnapshot = await get(postsRef)
    const totalPosts = postsSnapshot.exists() ? Object.keys(postsSnapshot.val()).length : 0

    // Get recent posts for activity metrics
    const recentPostsQuery = query(postsRef, orderByChild("createdAt"), limitToLast(100))
    const recentPostsSnapshot = await get(recentPostsQuery)

    let totalRecentLikes = 0
    let totalRecentComments = 0
    let totalRecentShares = 0

    if (recentPostsSnapshot.exists()) {
      const recentPostsData = recentPostsSnapshot.val()

      for (const postId in recentPostsData) {
        const post = recentPostsData[postId]

        totalRecentLikes += post.likesCount || 0
        totalRecentComments += post.commentsCount || 0
        totalRecentShares += post.sharesCount || 0
      }
    }

    // Calculate engagement rate
    const engagementRate = totalRecentLikes + totalRecentComments + totalRecentShares

    // Return platform analytics data
    return {
      totalUsers,
      totalPosts,
      engagementRate,
      // Add ML model accuracy data
      mlAccuracy: {
        overallAccuracy: 93.9,
        falsePositiveRate: 2.8,
        falseNegativeRate: 3.3,
        teluguLanguageSupport: 94.8,
        englishLanguageSupport: 97.2,
        hindiLanguageSupport: 92.1,
        imageModeration: 92.5,
        videoModeration: 89.7,
        audioModeration: 91.2,
      },
    }
  } catch (error) {
    console.error("Error getting platform analytics:", error)
    return null
  }
}

/**
 * Gets ML model accuracy metrics
 */
export async function getMLModelAccuracy(): Promise<any> {
  // In a real application, this would fetch actual metrics from your ML monitoring system
  // For now, we'll return mock data

  return {
    contentModeration: {
      overall: 94.5,
      byLanguage: {
        telugu: 94.8,
        english: 97.2,
        hindi: 92.1,
        tamil: 93.4,
        kannada: 91.8,
      },
      byContentType: {
        text: 96.3,
        image: 92.5,
        video: 89.7,
        audio: 91.2,
      },
      byCategory: {
        harassment: 95.1,
        hateSpeech: 93.8,
        violence: 94.2,
        adultContent: 96.7,
        gambling: 97.9,
      },
    },
    recommendation: {
      overall: 95.3,
      relevanceScore: 92.8,
      userSatisfaction: 89.4,
    },
    sentiment: {
      overall: 91.7,
      positive: 94.2,
      negative: 92.3,
      neutral: 88.6,
    },
  }
}


