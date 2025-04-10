import { ref, get, remove, query, orderByChild, limitToLast, onValue, off, update } from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { db, storage } from "./firebase/config"
import { v4 as uuidv4 } from "uuid"
import { safeSet, safeUpdate, safePush, safeGet } from "./db-helpers"
// Add these imports at the top of the file
import type { AudioModerationResult } from "./audio-moderation-service"
import type { User } from "@/lib/user-service"

// Simple content moderation without OpenAI
function localModerateContent(content: string): {
  isSafe: boolean
  category?: string
  confidence?: number
} {
  // List of potentially harmful words (very simplified example)
  const harmfulWords = ["hate", "kill", "attack", "harmful", "violent", "threat"]

  // Convert to lowercase for case-insensitive matching
  const lowerContent = content.toLowerCase()

  // Check if any harmful words are in the content
  const foundWords = harmfulWords.filter((word) => lowerContent.includes(word))

  if (foundWords.length > 0) {
    return {
      isSafe: false,
      category: "potentially_harmful",
      confidence: 0.7,
    }
  }

  return { isSafe: true }
}

// Simple sentiment analysis without external API
function localAnalyzeSentiment(content: string): {
  score: number
  label: "positive" | "neutral" | "negative"
  confidence: number
  emoji: string
  color: string
} {
  // Convert to lowercase
  const lowerContent = content.toLowerCase()

  // Simple positive and negative word lists
  const positiveWords = ["good", "great", "awesome", "excellent", "happy", "love", "like", "best"]
  const negativeWords = ["bad", "terrible", "awful", "poor", "sad", "hate", "dislike", "worst"]

  // Count positive and negative words
  const positiveCount = positiveWords.filter((word) => lowerContent.includes(word)).length
  const negativeCount = negativeWords.filter((word) => lowerContent.includes(word)).length

  // Calculate score (-1 to 1)
  const totalWords = lowerContent.split(/\s+/).length
  const positiveScore = positiveCount / totalWords
  const negativeScore = negativeCount / totalWords
  const score = positiveScore - negativeScore

  // Determine sentiment label
  let label: "positive" | "neutral" | "negative" = "neutral"
  let emoji = "😐"
  let color = "#888888"

  if (score > 0.05) {
    label = "positive"
    emoji = "😊"
    color = "#4CAF50"
  } else if (score < -0.05) {
    label = "negative"
    emoji = "😔"
    color = "#F44336"
  }

  return {
    score,
    label,
    confidence: Math.abs(score) * 2, // Simple confidence metric
    emoji,
    color,
  }
}

// Update the Post interface to include audio-related fields
export interface Post {
  id: string
  authorId: string
  authorName: string
  authorPhotoURL: string | null
  content: string
  contentLower?: string
  mediaURLs?: string[]
  mediaTypes?: string[]
  hasAudio?: boolean
  audioURL?: string
  audioTranscript?: string
  audioModerationResult?: {
    isSafe: boolean
    flaggedContent: {
      abusiveLanguage: string[]
      misinformation: string[]
      unauthorizedApps: string[]
    }
    contextualScore: number
    allowedRoasting: boolean
  }
  likes?: Record<string, boolean>
  likesCount: number
  commentsCount: number
  createdAt: string
  updatedAt: string
  sentiment?: {
    score: number
    label: "positive" | "neutral" | "negative"
    confidence: number
    emoji: string
    color: string
  }
  isSafe: boolean
  moderationStatus: "approved" | "pending" | "rejected"
  moderationReason?: string
  safetyCategory?: string
  safetyConfidence?: number
  comments: number
  author: {
    id: string
    name: string
    username: string
    avatarUrl?: string
  }
  isLiked?: boolean
  isSaved?: boolean
}

// Update the createPost function to handle audio content
export async function createPost(
  authorId: string,
  authorName: string,
  authorPhotoURL: string | null | undefined,
  content: string,
  mediaFiles?: File[],
  audioModeration?: AudioModerationResult | null,
): Promise<Post> {
  try {
    // Use local sentiment analysis and content moderation
    const sentiment = localAnalyzeSentiment(content)
    const moderationResult = localModerateContent(content)

    // Generate a new post ID
    const postsRef = ref(db, "posts")
    const newPostRef = await safePush("posts", {}) // Create empty entry first to get ID
    if (!newPostRef.key) throw new Error('Failed to create post reference')
    const postId = newPostRef.key

    // Upload media files if any
    const mediaURLs: string[] = []
    const mediaTypes: string[] = []
    let audioURL: string | undefined
    let hasAudio = false

    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        const fileExtension = file.name.split(".").pop()
        const fileName = `post_${postId}_${uuidv4()}.${fileExtension}`
        const mediaRef = storageRef(storage, `posts/${authorId}/${fileName}`)

        await uploadBytes(mediaRef, file)
        const downloadURL = await getDownloadURL(mediaRef)

        // Check if this is an audio file
        if (file.type.startsWith("audio/")) {
          audioURL = downloadURL
          hasAudio = true
        } else {
          mediaURLs.push(downloadURL)
          mediaTypes.push(file.type.startsWith("image/") ? "image" : "video")
        }
      }
    }

    const timestamp = new Date().toISOString()

    // Create post object - ensure authorPhotoURL is null, not undefined
    const newPost: Post = {
      id: postId,
      authorId,
      authorName,
      authorPhotoURL: authorPhotoURL ?? null, // Convert undefined to null
      content,
      contentLower: content.toLowerCase(),
      mediaURLs: mediaURLs.length > 0 ? mediaURLs : undefined,
      mediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
      hasAudio: hasAudio || undefined,
      audioURL,
      likesCount: 0,
      commentsCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      sentiment,
      isSafe: moderationResult.isSafe && (!audioModeration || audioModeration.isSafe),
      moderationStatus:
        moderationResult.isSafe && (!audioModeration || audioModeration.isSafe) ? "approved" : "pending",
      safetyCategory: moderationResult.isSafe ? undefined : moderationResult.category,
      safetyConfidence: moderationResult.isSafe ? undefined : moderationResult.confidence,
      comments: 0,
      author: {
        id: authorId,
        name: authorName,
        username: "",
        avatarUrl: authorPhotoURL,
      },
    }

    // Add audio moderation results if available
    if (audioModeration && hasAudio) {
      newPost.audioTranscript = audioModeration.transcript
      newPost.audioModerationResult = {
        isSafe: audioModeration.isSafe,
        flaggedContent: audioModeration.flaggedContent,
        contextualScore: audioModeration.contextualScore,
        allowedRoasting: audioModeration.allowedRoasting,
      }
    }

    // Save post to database using our safe method
    await safeSet(`posts/${postId}`, newPost)

    // Add post to user's posts list
    await safeSet(`users/${authorId}/posts/${postId}`, true)

    // Log moderation event if content is flagged
    if (!moderationResult.isSafe || (audioModeration && !audioModeration.isSafe)) {
      await safePush("moderation-logs", {
        type: "post",
        postId,
        authorId,
        content,
        hasAudio,
        audioTranscript: audioModeration?.transcript,
        result: {
          text: moderationResult,
          audio: audioModeration
            ? {
                isSafe: audioModeration.isSafe,
                flaggedContent: audioModeration.flaggedContent,
              }
            : null,
        },
        timestamp: Date.now(),
        reviewed: false,
        actionTaken: false,
      })
    }

    return newPost
  } catch (error) {
    console.error("Error creating post:", error)
    throw error
  }
}

// Rest of the post-service functions updated to use the safe helpers
export async function getPost(postId: string): Promise<Post | null> {
  try {
    const snapshot = await safeGet(`posts/${postId}`)

    if (snapshot.exists()) {
      return { ...snapshot.val(), id: snapshot.key } as Post
    }

    return null
  } catch (error) {
    console.error("Error getting post:", error)
    return null
  }
}

export async function updatePost(postId: string, updates: Partial<Post>): Promise<void> {
  // If content is updated, update contentLower as well
  if (updates.content) {
    updates.contentLower = updates.content.toLowerCase()

    // Re-analyze sentiment and moderation if content changes
    const sentiment = localAnalyzeSentiment(updates.content)
    const moderationResult = localModerateContent(updates.content)

    updates.sentiment = sentiment
    updates.isSafe = moderationResult.isSafe
    updates.moderationStatus = moderationResult.isSafe ? "approved" : "pending"

    // Log moderation event if content is flagged
    if (!moderationResult.isSafe) {
      await safePush("moderation-logs", {
        type: "post-update",
        postId,
        content: updates.content,
        result: moderationResult,
        timestamp: Date.now(),
        reviewed: false,
        actionTaken: false,
      })
    }
  }

  await safeUpdate(`posts/${postId}`, {
    ...updates,
    updatedAt: new Date().toISOString(),
  })
}

export async function deletePost(postId: string, authorId: string): Promise<void> {
  try {
    // Remove post from database
    await remove(ref(db, `posts/${postId}`))

    // Remove post from user's posts list
    await remove(ref(db, `users/${authorId}/posts/${postId}`))
  } catch (error) {
    console.error("Error deleting post:", error)
    throw error
  }
}

export async function likePost(postId: string, userId: string): Promise<void> {
  const likeRef = ref(db, `postLikes/${postId}/${userId}`)
  const postRef = ref(db, `posts/${postId}`)

  const likeSnapshot = await get(likeRef)
  const isLiked = likeSnapshot.exists()

  if (isLiked) {
    // Unlike
    await remove(likeRef)
    await update(postRef, {
      likesCount: (await get(postRef)).val().likesCount - 1,
    })
  } else {
    // Like
    await update(likeRef, { exists: true })
    await update(postRef, {
      likesCount: (await get(postRef)).val().likesCount + 1,
    })
  }
}

export async function unlikePost(postId: string, userId: string): Promise<void> {
  try {
    // Remove user from post's likes
    await remove(ref(db, `posts/${postId}/likes/${userId}`))

    // Get current likes count
    const snapshot = await safeGet(`posts/${postId}`)

    if (snapshot.exists()) {
      const post = snapshot.val() as Post
      const likesCount = Math.max((post.likesCount || 0) - 1, 0)

      // Update likes count
      await safeUpdate(`posts/${postId}`, { likesCount })
    }
  } catch (error) {
    console.error("Error unliking post:", error)
    throw error
  }
}

export async function createNotification(userId: string, notification: any): Promise<void> {
  try {
    await safePush(`users/${userId}/notifications`, notification)
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}

export async function isLiked(postId: string, userId: string): Promise<boolean> {
  const likeRef = ref(db, `postLikes/${postId}/${userId}`)
  const snapshot = await get(likeRef)
  return snapshot.exists()
}

export async function getFeedPosts(limit: number = 20): Promise<Post[]> {
  const response = await fetch(`/api/posts?limit=${limit}`)
  return response.json()
}

export async function getUserPosts(userId: string, limit = 20): Promise<Post[]> {
  try {
    // Get user's post IDs
    const userPostsRef = ref(db, `users/${userId}/posts`)
    const snapshot = await get(userPostsRef)

    if (!snapshot.exists()) return []

    // Get post details for each post ID
    const postIds = Object.keys(snapshot.val())
    const postPromises = postIds.map((id) => getPost(id))
    const posts = await Promise.all(postPromises)

    // Filter out null values and sort by createdAt
    const filteredPosts = posts.filter(Boolean) as Post[]
    return filteredPosts
      .sort((a: Post, b: Post) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error("Error getting user posts:", error)
    return []
  }
}

export function subscribeToPost(postId: string, callback: (post: Post | null) => void): () => void {
  const postRef = ref(db, `posts/${postId}`)

  const onPostChange = onValue(
    postRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...snapshot.val(), id: snapshot.key } as Post)
      } else {
        callback(null)
      }
    },
    (error) => {
      console.error("Error subscribing to post:", error)
      callback(null)
    },
  )

  // Return unsubscribe function
  return () => off(postRef, "value", onPostChange)
}

export function subscribeToFeed(callback: (posts: Post[]) => void, limit = 10): () => void {
  const postsRef = ref(db, "posts")

  const onPostsChange = onValue(
    postsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const posts: Post[] = []

        snapshot.forEach((childSnapshot) => {
          posts.push({ ...childSnapshot.val(), id: childSnapshot.key } as Post)
        })

        // Sort by createdAt in descending order (newest first)
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // Limit the number of posts
        callback(posts.slice(0, limit))
      } else {
        callback([])
      }
    },
    (error) => {
      console.error("Error subscribing to feed:", error)
      callback([])
    },
  )

  // Return unsubscribe function
  return () => off(postsRef, "value", onPostsChange)
}

export function subscribeToUserPosts(userId: string, callback: (posts: Post[]) => void): () => void {
  const userPostsRef = ref(db, `users/${userId}/posts`)

  const onUserPostsChange = onValue(
    userPostsRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const postIds = Object.keys(snapshot.val())

        // Get post details for each post ID
        const postsPromises = postIds.map((postId) => getPost(postId))
        const posts = await Promise.all(postsPromises)

        // Filter out null values and sort by createdAt in descending order
        const validPosts = posts.filter(Boolean) as Post[]
        validPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        callback(validPosts)
      } else {
        callback([])
      }
    },
    (error) => {
      console.error("Error subscribing to user posts:", error)
      callback([])
    },
  )

  // Return unsubscribe function
  return () => off(userPostsRef, "value", onUserPostsChange)
}

export async function getUserLikedPosts(userId: string): Promise<Post[]> {
  try {
    // Get all posts
    const postsRef = ref(db, "posts")
    const snapshot = await get(postsRef)

    if (!snapshot.exists()) return []

    const likedPosts: Post[] = []

    // Filter posts that the user has liked
    snapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val() as Post
      post.id = childSnapshot.key as string

      // Check if the user has liked this post
      if (post.likes && post.likes[userId]) {
        likedPosts.push(post)
      }
    })

    // Sort by createdAt in descending order (newest first)
    return likedPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.error("Error getting user liked posts:", error)
    return []
  }
}

// Search posts by content
export async function searchPosts(query: string, limit = 10): Promise<Post[]> {
  try {
    const postsRef = ref(db, "posts")
    const snapshot = await get(postsRef)

    if (!snapshot.exists()) return []

    const posts: Post[] = []
    const lowerQuery = query.toLowerCase()

    snapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val() as Post
      post.id = childSnapshot.key as string

      // Check if post content contains the query
      if (post.contentLower && post.contentLower.includes(lowerQuery)) {
        posts.push(post)
      }
    })

    // Sort by relevance (exact matches first, then starts with, then contains)
    return posts
      .sort((a, b) => {
        // Sort by createdAt as a tiebreaker
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching posts:", error)
    return []
  }
}

export async function savePost(postId: string, userId: string): Promise<void> {
  const savedRef = ref(db, `savedPosts/${userId}/${postId}`)
  const saveSnapshot = await get(savedRef)
  const isSaved = saveSnapshot.exists()

  if (isSaved) {
    // Unsave
    await remove(savedRef)
  } else {
    // Save
    await update(savedRef, { exists: true })
  }
}

export async function isPostSaved(postId: string, userId: string): Promise<boolean> {
  const savedRef = ref(db, `savedPosts/${userId}/${postId}`)
  const snapshot = await get(savedRef)
  return snapshot.exists()
}

