import { ref, set, get, remove } from "firebase/database"
import { db } from "./firebase/config"

export interface SavedPost {
  id: string
  userId: string
  postId: string
  savedAt: number
  postData?: any // The actual post data
}

/**
 * Saves a post for a user
 */
export async function savePost(userId: string, postId: string): Promise<boolean> {
  try {
    // Check if the post exists
    const postRef = ref(db, `posts/${postId}`)
    const postSnapshot = await get(postRef)

    if (!postSnapshot.exists()) {
      console.error("Post does not exist:", postId)
      return false
    }

    // Check if the post is already saved
    const savedPostsRef = ref(db, `saved-posts/${userId}/${postId}`)
    const savedPostSnapshot = await get(savedPostsRef)

    if (savedPostSnapshot.exists()) {
      console.log("Post already saved:", postId)
      return true
    }

    // Save the post
    const savedPost: SavedPost = {
      id: `${userId}_${postId}`,
      userId,
      postId,
      savedAt: Date.now(),
    }

    await set(savedPostsRef, savedPost)

    return true
  } catch (error) {
    console.error("Error saving post:", error)
    return false
  }
}

/**
 * Unsaves a post for a user
 */
export async function unsavePost(userId: string, postId: string): Promise<boolean> {
  try {
    const savedPostRef = ref(db, `saved-posts/${userId}/${postId}`)
    const savedPostSnapshot = await get(savedPostRef)

    if (!savedPostSnapshot.exists()) {
      console.log("Post not saved:", postId)
      return true
    }

    // Remove the saved post
    await remove(savedPostRef)

    return true
  } catch (error) {
    console.error("Error unsaving post:", error)
    return false
  }
}

/**
 * Checks if a post is saved by a user
 */
export async function isPostSaved(userId: string, postId: string): Promise<boolean> {
  try {
    const savedPostRef = ref(db, `saved-posts/${userId}/${postId}`)
    const savedPostSnapshot = await get(savedPostRef)

    return savedPostSnapshot.exists()
  } catch (error) {
    console.error("Error checking if post is saved:", error)
    return false
  }
}

/**
 * Gets all saved posts for a user
 */
export async function getSavedPosts(userId: string): Promise<SavedPost[]> {
  try {
    const savedPostsRef = ref(db, `saved-posts/${userId}`)
    const savedPostsSnapshot = await get(savedPostsRef)

    if (!savedPostsSnapshot.exists()) {
      return []
    }

    const savedPosts = savedPostsSnapshot.val()
    const savedPostsArray: SavedPost[] = []

    // Get the actual post data for each saved post
    for (const postId in savedPosts) {
      const savedPost = savedPosts[postId]

      // Get the post data
      const postRef = ref(db, `posts/${postId}`)
      const postSnapshot = await get(postRef)

      if (postSnapshot.exists()) {
        savedPost.postData = postSnapshot.val()
        savedPostsArray.push(savedPost)
      }
    }

    // Sort by savedAt timestamp (newest first)
    return savedPostsArray.sort((a, b) => b.savedAt - a.savedAt)
  } catch (error) {
    console.error("Error getting saved posts:", error)
    return []
  }
}

/**
 * Gets the count of saved posts for a user
 */
export async function getSavedPostsCount(userId: string): Promise<number> {
  try {
    const savedPostsRef = ref(db, `saved-posts/${userId}`)
    const savedPostsSnapshot = await get(savedPostsRef)

    if (!savedPostsSnapshot.exists()) {
      return 0
    }

    return Object.keys(savedPostsSnapshot.val()).length
  } catch (error) {
    console.error("Error getting saved posts count:", error)
    return 0
  }
}

/**
 * Gets the users who saved a specific post
 */
export async function getUsersWhoSavedPost(postId: string): Promise<string[]> {
  try {
    const userIds: string[] = []

    // This is a more complex query that requires iterating through all saved posts
    // A more efficient approach would be to have a separate collection for post saves
    const allSavedPostsRef = ref(db, "saved-posts")
    const allSavedPostsSnapshot = await get(allSavedPostsRef)

    if (!allSavedPostsSnapshot.exists()) {
      return []
    }

    const allSavedPosts = allSavedPostsSnapshot.val()

    for (const userId in allSavedPosts) {
      const userSavedPosts = allSavedPosts[userId]

      if (userSavedPosts && userSavedPosts[postId]) {
        userIds.push(userId)
      }
    }

    return userIds
  } catch (error) {
    console.error("Error getting users who saved post:", error)
    return []
  }
}

/**
 * Gets the most saved posts
 */
export async function getMostSavedPosts(limit = 10): Promise<{ postId: string; saveCount: number }[]> {
  try {
    const postSaveCounts: { [key: string]: number } = {}

    // Get all saved posts
    const allSavedPostsRef = ref(db, "saved-posts")
    const allSavedPostsSnapshot = await get(allSavedPostsRef)

    if (!allSavedPostsSnapshot.exists()) {
      return []
    }

    const allSavedPosts = allSavedPostsSnapshot.val()

    // Count saves for each post
    for (const userId in allSavedPosts) {
      const userSavedPosts = allSavedPosts[userId]

      for (const postId in userSavedPosts) {
        if (!postSaveCounts[postId]) {
          postSaveCounts[postId] = 0
        }

        postSaveCounts[postId]++
      }
    }

    // Convert to array and sort
    const sortedPosts = Object.entries(postSaveCounts)
      .map(([postId, saveCount]) => ({ postId, saveCount }))
      .sort((a, b) => b.saveCount - a.saveCount)
      .slice(0, limit)

    return sortedPosts
  } catch (error) {
    console.error("Error getting most saved posts:", error)
    return []
  }
}


