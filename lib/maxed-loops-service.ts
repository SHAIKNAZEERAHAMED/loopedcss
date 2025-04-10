import { ref, set, get, push, query, orderByChild, equalTo, limitToLast } from "firebase/database"
import { db, storage } from "./firebase/config"
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage"
import { moderateVideo, moderateText } from "./advanced-moderation-service"

// MaxedLoop interface
export interface MaxedLoop {
  id: string
  userId: string
  username: string
  userAvatar: string
  videoUrl: string
  thumbnailUrl: string
  caption: string
  hashtags: string[]
  likes: number
  comments: number
  shares: number
  views: number
  duration: number // in seconds
  createdAt: number
  isApproved: boolean
  moderationStatus?: {
    isApproved: boolean
    moderationId?: string
    requiresHumanReview?: boolean
  }
}

// Comment interface
export interface MaxedLoopComment {
  id: string
  maxedLoopId: string
  userId: string
  username: string
  userAvatar: string
  text: string
  likes: number
  createdAt: number
  isApproved: boolean
}

/**
 * Creates a new Maxed Loop
 */
export async function createMaxedLoop(
  userId: string,
  videoFile: File,
  thumbnailFile: File,
  caption: string,
  hashtags: string[],
): Promise<{ success: boolean; maxedLoopId?: string; error?: string }> {
  try {
    // Get user profile
    const userRef = ref(db, `users/${userId}`)
    const userSnapshot = await get(userRef)

    if (!userSnapshot.exists()) {
      return { success: false, error: "User not found" }
    }

    const user = userSnapshot.val()

    // Generate unique ID
    const maxedLoopId = push(ref(db, "maxed-loops")).key as string

    // Upload video
    const videoPath = `maxed-loops/${userId}/${maxedLoopId}/video`
    const videoStorageRef = storageRef(storage, videoPath)
    await uploadBytes(videoStorageRef, videoFile)
    const videoUrl = await getDownloadURL(videoStorageRef)

    // Upload thumbnail
    const thumbnailPath = `maxed-loops/${userId}/${maxedLoopId}/thumbnail`
    const thumbnailStorageRef = storageRef(storage, thumbnailPath)
    await uploadBytes(thumbnailStorageRef, thumbnailFile)
    const thumbnailUrl = await getDownloadURL(thumbnailStorageRef)

    // Create video metadata object
    const maxedLoop: Omit<MaxedLoop, "isApproved" | "moderationStatus"> = {
      id: maxedLoopId,
      userId,
      username: user.username || "Anonymous",
      userAvatar: user.profilePicture || "/placeholder.svg?height=40&width=40",
      videoUrl,
      thumbnailUrl,
      caption,
      hashtags,
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      duration: 30, // Default to 30 seconds, should be calculated from actual video
      createdAt: Date.now(),
    }

    // Moderate the content before publishing
    // 1. Moderate the video
    const videoModeration = await moderateVideo(videoUrl, thumbnailUrl, userId, maxedLoopId)

    // 2. Moderate the caption
    const captionModeration = await moderateText(caption, userId, `${maxedLoopId}_caption`)

    // Determine if the content is approved based on both moderations
    const isApproved = videoModeration.isApproved && captionModeration.isApproved

    // Save the maxed loop with moderation status
    await set(ref(db, `maxed-loops/${maxedLoopId}`), {
      ...maxedLoop,
      isApproved,
      moderationStatus: {
        isApproved,
        moderationId: videoModeration.id,
        requiresHumanReview: videoModeration.isApproved === false || captionModeration.isApproved === false,
      },
    })

    // Update user's maxed loops count
    const userMaxedLoopsRef = ref(db, `users/${userId}/maxedLoopsCount`)
    const userMaxedLoopsSnapshot = await get(userMaxedLoopsRef)
    const currentCount = userMaxedLoopsSnapshot.exists() ? userMaxedLoopsSnapshot.val() : 0
    await set(userMaxedLoopsRef, currentCount + 1)

    // Add to user's maxed loops list
    await set(ref(db, `user-maxed-loops/${userId}/${maxedLoopId}`), {
      id: maxedLoopId,
      createdAt: Date.now(),
      isApproved,
    })

    // Add hashtags to trending
    for (const hashtag of hashtags) {
      const hashtagRef = ref(db, `trending-hashtags/${hashtag.toLowerCase()}`)
      const hashtagSnapshot = await get(hashtagRef)
      const count = hashtagSnapshot.exists() ? hashtagSnapshot.val().count : 0
      await set(hashtagRef, {
        count: count + 1,
        lastUsed: Date.now(),
      })
    }

    return { success: true, maxedLoopId }
  } catch (error) {
    console.error("Error creating maxed loop:", error)
    return { success: false, error: "Failed to create maxed loop" }
  }
}

/**
 * Gets a single Maxed Loop by ID
 */
export async function getMaxedLoop(maxedLoopId: string): Promise<MaxedLoop | null> {
  try {
    const maxedLoopRef = ref(db, `maxed-loops/${maxedLoopId}`)
    const maxedLoopSnapshot = await get(maxedLoopRef)

    if (!maxedLoopSnapshot.exists()) {
      return null
    }

    return maxedLoopSnapshot.val() as MaxedLoop
  } catch (error) {
    console.error("Error getting maxed loop:", error)
    return null
  }
}

/**
 * Gets a feed of Maxed Loops
 */
export async function getMaxedLoopsFeed(limit = 10, lastMaxedLoopId?: string): Promise<MaxedLoop[]> {
  try {
    let maxedLoopsQuery

    if (lastMaxedLoopId) {
      // Get the timestamp of the last maxed loop
      const lastMaxedLoopRef = ref(db, `maxed-loops/${lastMaxedLoopId}`)
      const lastMaxedLoopSnapshot = await get(lastMaxedLoopRef)

      if (!lastMaxedLoopSnapshot.exists()) {
        return []
      }

      const lastMaxedLoop = lastMaxedLoopSnapshot.val() as MaxedLoop

      // Query for maxed loops created before the last one
      maxedLoopsQuery = query(
        ref(db, "maxed-loops"),
        orderByChild("createdAt"),
        // @ts-ignore - Firebase types issue
        equalTo(lastMaxedLoop.createdAt, "endAt"),
        limitToLast(limit + 1), // +1 to check if we have more
      )
    } else {
      // Query for the most recent maxed loops
      maxedLoopsQuery = query(ref(db, "maxed-loops"), orderByChild("createdAt"), limitToLast(limit))
    }

    const maxedLoopsSnapshot = await get(maxedLoopsQuery)

    if (!maxedLoopsSnapshot.exists()) {
      return []
    }

    // Convert to array and filter out unapproved content
    const maxedLoops: MaxedLoop[] = []
    maxedLoopsSnapshot.forEach((childSnapshot) => {
      const maxedLoop = childSnapshot.val() as MaxedLoop
      if (maxedLoop.isApproved) {
        maxedLoops.push(maxedLoop)
      }
    })

    // Sort by createdAt in descending order
    return maxedLoops.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error("Error getting maxed loops feed:", error)
    return []
  }
}

/**
 * Gets a user's Maxed Loops
 */
export async function getUserMaxedLoops(userId: string, limit = 10, lastMaxedLoopId?: string): Promise<MaxedLoop[]> {
  try {
    let userMaxedLoopsQuery

    if (lastMaxedLoopId) {
      // Get the timestamp of the last maxed loop
      const lastMaxedLoopRef = ref(db, `user-maxed-loops/${userId}/${lastMaxedLoopId}`)
      const lastMaxedLoopSnapshot = await get(lastMaxedLoopRef)

      if (!lastMaxedLoopSnapshot.exists()) {
        return []
      }

      const lastMaxedLoop = lastMaxedLoopSnapshot.val()

      // Query for maxed loops created before the last one
      userMaxedLoopsQuery = query(
        ref(db, `user-maxed-loops/${userId}`),
        orderByChild("createdAt"),
        // @ts-ignore - Firebase types issue
        equalTo(lastMaxedLoop.createdAt, "endAt"),
        limitToLast(limit + 1), // +1 to check if we have more
      )
    } else {
      // Query for the most recent maxed loops
      userMaxedLoopsQuery = query(ref(db, `user-maxed-loops/${userId}`), orderByChild("createdAt"), limitToLast(limit))
    }

    const userMaxedLoopsSnapshot = await get(userMaxedLoopsQuery)

    if (!userMaxedLoopsSnapshot.exists()) {
      return []
    }

    // Get the full maxed loop objects
    const maxedLoopIds: string[] = []
    userMaxedLoopsSnapshot.forEach((childSnapshot) => {
      maxedLoopIds.push(childSnapshot.key as string)
    })

    // Get the full maxed loop objects
    const maxedLoops: MaxedLoop[] = []
    for (const maxedLoopId of maxedLoopIds) {
      const maxedLoop = await getMaxedLoop(maxedLoopId)
      if (maxedLoop) {
        maxedLoops.push(maxedLoop)
      }
    }

    // Sort by createdAt in descending order
    return maxedLoops.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error("Error getting user maxed loops:", error)
    return []
  }
}

/**
 * Likes a Maxed Loop
 */
export async function likeMaxedLoop(maxedLoopId: string, userId: string): Promise<boolean> {
  try {
    // Check if the user has already liked this maxed loop
    const likeRef = ref(db, `maxed-loop-likes/${maxedLoopId}/${userId}`)
    const likeSnapshot = await get(likeRef)

    if (likeSnapshot.exists()) {
      // User has already liked this maxed loop, unlike it
      await set(likeRef, null)

      // Update the likes count
      const maxedLoopRef = ref(db, `maxed-loops/${maxedLoopId}/likes`)
      const likesSnapshot = await get(maxedLoopRef)
      const currentLikes = likesSnapshot.exists() ? likesSnapshot.val() : 0
      await set(maxedLoopRef, Math.max(0, currentLikes - 1))

      return false // Unliked
    } else {
      // User has not liked this maxed loop, like it
      await set(likeRef, {
        timestamp: Date.now(),
      })

      // Update the likes count
      const maxedLoopRef = ref(db, `maxed-loops/${maxedLoopId}/likes`)
      const likesSnapshot = await get(maxedLoopRef)
      const currentLikes = likesSnapshot.exists() ? likesSnapshot.val() : 0
      await set(maxedLoopRef, currentLikes + 1)

      return true // Liked
    }
  } catch (error) {
    console.error("Error liking maxed loop:", error)
    return false
  }
}

/**
 * Checks if a user has liked a Maxed Loop
 */
export async function hasLikedMaxedLoop(maxedLoopId: string, userId: string): Promise<boolean> {
  try {
    const likeRef = ref(db, `maxed-loop-likes/${maxedLoopId}/${userId}`)
    const likeSnapshot = await get(likeRef)

    return likeSnapshot.exists()
  } catch (error) {
    console.error("Error checking if user has liked maxed loop:", error)
    return false
  }
}

/**
 * Comments on a Maxed Loop
 */
export async function commentOnMaxedLoop(
  maxedLoopId: string,
  userId: string,
  text: string,
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    // Get user profile
    const userRef = ref(db, `users/${userId}`)
    const userSnapshot = await get(userRef)

    if (!userSnapshot.exists()) {
      return { success: false, error: "User not found" }
    }

    const user = userSnapshot.val()

    // Generate unique ID
    const commentId = push(ref(db, "maxed-loop-comments")).key as string

    // Moderate the comment text
    const textModeration = await moderateText(text, userId, `${maxedLoopId}_comment_${commentId}`)

    // Create comment object
    const comment: MaxedLoopComment = {
      id: commentId,
      maxedLoopId,
      userId,
      username: user.username || "Anonymous",
      userAvatar: user.profilePicture || "/placeholder.svg?height=40&width=40",
      text,
      likes: 0,
      createdAt: Date.now(),
      isApproved: textModeration.isApproved,
    }

    // Save the comment
    await set(ref(db, `maxed-loop-comments/${maxedLoopId}/${commentId}`), comment)

    // Update the comments count if approved
    if (textModeration.isApproved) {
      const maxedLoopRef = ref(db, `maxed-loops/${maxedLoopId}/comments`)
      const commentsSnapshot = await get(maxedLoopRef)
      const currentComments = commentsSnapshot.exists() ? commentsSnapshot.val() : 0
      await set(maxedLoopRef, currentComments + 1)
    }

    return { success: true, commentId }
  } catch (error) {
    console.error("Error commenting on maxed loop:", error)
    return { success: false, error: "Failed to comment on maxed loop" }
  }
}

/**
 * Gets comments for a Maxed Loop
 */
export async function getMaxedLoopComments(
  maxedLoopId: string,
  limit = 10,
  lastCommentId?: string,
): Promise<MaxedLoopComment[]> {
  try {
    let commentsQuery

    if (lastCommentId) {
      // Get the timestamp of the last comment
      const lastCommentRef = ref(db, `maxed-loop-comments/${maxedLoopId}/${lastCommentId}`)
      const lastCommentSnapshot = await get(lastCommentRef)

      if (!lastCommentSnapshot.exists()) {
        return []
      }

      const lastComment = lastCommentSnapshot.val() as MaxedLoopComment

      // Query for comments created before the last one
      commentsQuery = query(
        ref(db, `maxed-loop-comments/${maxedLoopId}`),
        orderByChild("createdAt"),
        // @ts-ignore - Firebase types issue
        equalTo(lastComment.createdAt, "endAt"),
        limitToLast(limit + 1), // +1 to check if we have more
      )
    } else {
      // Query for the most recent comments
      commentsQuery = query(
        ref(db, `maxed-loop-comments/${maxedLoopId}`),
        orderByChild("createdAt"),
        limitToLast(limit),
      )
    }

    const commentsSnapshot = await get(commentsQuery)

    if (!commentsSnapshot.exists()) {
      return []
    }

    // Convert to array and filter out unapproved comments
    const comments: MaxedLoopComment[] = []
    commentsSnapshot.forEach((childSnapshot) => {
      const comment = childSnapshot.val() as MaxedLoopComment
      if (comment.isApproved) {
        comments.push(comment)
      }
    })

    // Sort by createdAt in descending order
    return comments.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error("Error getting maxed loop comments:", error)
    return []
  }
}

/**
 * Shares a Maxed Loop
 */
export async function shareMaxedLoop(maxedLoopId: string, userId: string): Promise<boolean> {
  try {
    // Record the share
    const shareRef = push(ref(db, `maxed-loop-shares/${maxedLoopId}`))
    await set(shareRef, {
      userId,
      timestamp: Date.now(),
    })

    // Update the shares count
    const maxedLoopRef = ref(db, `maxed-loops/${maxedLoopId}/shares`)
    const sharesSnapshot = await get(maxedLoopRef)
    const currentShares = sharesSnapshot.exists() ? sharesSnapshot.val() : 0
    await set(maxedLoopRef, currentShares + 1)

    return true
  } catch (error) {
    console.error("Error sharing maxed loop:", error)
    return false
  }
}

/**
 * Records a view for a Maxed Loop
 */
export async function recordMaxedLoopView(maxedLoopId: string, userId?: string): Promise<boolean> {
  try {
    // Record the view
    const viewRef = push(ref(db, `maxed-loop-views/${maxedLoopId}`))
    await set(viewRef, {
      userId: userId || "anonymous",
      timestamp: Date.now(),
    })

    // Update the views count
    const maxedLoopRef = ref(db, `maxed-loops/${maxedLoopId}/views`)
    const viewsSnapshot = await get(maxedLoopRef)
    const currentViews = viewsSnapshot.exists() ? viewsSnapshot.val() : 0
    await set(maxedLoopRef, currentViews + 1)

    return true
  } catch (error) {
    console.error("Error recording maxed loop view:", error)
    return false
  }
}

/**
 * Gets trending Maxed Loops
 */
export async function getTrendingMaxedLoops(limit = 10): Promise<MaxedLoop[]> {
  try {
    // Calculate a trending score based on recent engagement
    // This is a simplified version - in production, you'd want a more sophisticated algorithm
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000

    // Get all maxed loops
    const maxedLoopsRef = ref(db, "maxed-loops")
    const maxedLoopsSnapshot = await get(maxedLoopsRef)

    if (!maxedLoopsSnapshot.exists()) {
      return []
    }

    // Calculate trending score for each maxed loop
    const maxedLoopsWithScore: (MaxedLoop & { score: number })[] = []
    maxedLoopsSnapshot.forEach((childSnapshot) => {
      const maxedLoop = childSnapshot.val() as MaxedLoop

      if (!maxedLoop.isApproved) {
        return // Skip unapproved content
      }

      // Calculate recency factor (1.0 for now, decreasing for older content)
      const ageInDays = (now - maxedLoop.createdAt) / oneDay
      const recencyFactor = Math.max(0.1, 1.0 - ageInDays * 0.1)

      // Calculate engagement score
      const engagementScore =
        maxedLoop.likes * 1 + maxedLoop.comments * 2 + maxedLoop.shares * 3 + maxedLoop.views * 0.1

      // Calculate final trending score
      const trendingScore = engagementScore * recencyFactor

      maxedLoopsWithScore.push({
        ...maxedLoop,
        score: trendingScore,
      })
    })

    // Sort by trending score and take the top ones
    return maxedLoopsWithScore.sort((a, b) => b.score - a.score).slice(0, limit)
  } catch (error) {
    console.error("Error getting trending maxed loops:", error)
    return []
  }
}

/**
 * Gets Maxed Loops by hashtag
 */
export async function getMaxedLoopsByHashtag(
  hashtag: string,
  limit = 10,
  lastMaxedLoopId?: string,
): Promise<MaxedLoop[]> {
  try {
    // Normalize the hashtag
    const normalizedHashtag = hashtag.toLowerCase().replace(/^#/, "")

    // Get all maxed loops
    const maxedLoopsRef = ref(db, "maxed-loops")
    const maxedLoopsSnapshot = await get(maxedLoopsRef)

    if (!maxedLoopsSnapshot.exists()) {
      return []
    }

    // Filter maxed loops by hashtag
    const maxedLoopsWithHashtag: MaxedLoop[] = []
    maxedLoopsSnapshot.forEach((childSnapshot) => {
      const maxedLoop = childSnapshot.val() as MaxedLoop

      if (!maxedLoop.isApproved) {
        return // Skip unapproved content
      }

      // Check if the maxed loop has the hashtag
      if (maxedLoop.hashtags.some((tag) => tag.toLowerCase().replace(/^#/, "") === normalizedHashtag)) {
        maxedLoopsWithHashtag.push(maxedLoop)
      }
    })

    // Sort by createdAt in descending order
    const sortedMaxedLoops = maxedLoopsWithHashtag.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination if lastMaxedLoopId is provided
    if (lastMaxedLoopId) {
      const lastIndex = sortedMaxedLoops.findIndex((loop) => loop.id === lastMaxedLoopId)
      if (lastIndex !== -1 && lastIndex + 1 < sortedMaxedLoops.length) {
        return sortedMaxedLoops.slice(lastIndex + 1, lastIndex + 1 + limit)
      }
      return []
    }

    // Return the first page
    return sortedMaxedLoops.slice(0, limit)
  } catch (error) {
    console.error("Error getting maxed loops by hashtag:", error)
    return []
  }
}


