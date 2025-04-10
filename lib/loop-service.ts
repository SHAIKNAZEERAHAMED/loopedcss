import { db } from "./firebase/config"
import { ref, set, get, update, push, query, orderByChild, equalTo, onValue, off } from "firebase/database"
import { moderateContent } from "@/lib/moderation-service"
import { analyzeSentiment } from "@/lib/sentiment-analysis"
import { User } from "@/lib/user-service"
import { auth } from "./firebase/config"

export interface Loop {
  id: string
  name: string
  nameLower: string
  description: string
  category: string
  genre: string
  creatorId: string
  creatorName: string
  memberCount: number
  postCount: number
  color: string
  createdAt: number
  updatedAt: number
  isModerated: boolean
  moderationStatus: "approved" | "pending" | "rejected"
  rules: string[]
  tags: string[]
}

export interface LoopPost {
  id: string
  loopId: string
  content: string
  authorId: string
  authorName: string
  authorPhotoURL?: string
  createdAt: number
  updatedAt: number
  likesCount: number
  commentsCount: number
  mediaURLs?: string[]
  mediaTypes?: string[]
  sentiment?: {
    score: number
    label: "positive" | "neutral" | "negative"
    confidence: number
  }
  isSafe: boolean
  moderationStatus: "approved" | "pending" | "rejected"
  moderationReason?: string
  likes?: { [userId: string]: boolean }
  comments?: { [commentId: string]: any }
  saved?: { [userId: string]: boolean }
}

export interface LoopMember {
  userId: string
  displayName: string
  photoURL?: string
  role: "admin" | "moderator" | "member"
  joinedAt: number
}

// Available genres for loops
export const loopGenres = [
  "Technology",
  "Art",
  "Music",
  "Gaming",
  "Sports",
  "Fitness",
  "Food",
  "Travel",
  "Fashion",
  "Education",
  "Science",
  "Business",
  "Finance",
  "Entertainment",
  "Politics",
  "Health",
  "Lifestyle",
  "Photography",
  "Books",
  "Movies",
  "Television",
  "Pets",
  "Parenting",
  "Relationships",
  "DIY",
  "Crafts",
  "Nature",
  "Environment",
  "History",
  "Philosophy",
  "Religion",
  "Spirituality",
  "Other",
]

// Create a new loop
export async function createLoop(
  name: string,
  description: string,
  category: string,
  genre: string,
  creatorId: string,
  creatorName: string,
  color = "#4ECDC4",
  rules: string[] = ["Be respectful", "No spam", "No hate speech"],
): Promise<Loop> {
  try {
    // Moderate the loop name and description
    const [nameModeration, descriptionModeration] = await Promise.all([
      moderateContent(name),
      moderateContent(description),
    ])

    // Check if content is safe
    const isSafe = nameModeration.isSafe && descriptionModeration.isSafe

    // Generate a new loop ID
    const loopsRef = ref(db, "loops")
    const newLoopRef = push(loopsRef)
    const loopId = newLoopRef.key as string

    const timestamp = Date.now()

    // Create loop object
    const newLoop: Loop = {
      id: loopId,
      name,
      nameLower: name.toLowerCase(),
      description,
      category,
      genre,
      creatorId,
      creatorName,
      memberCount: 1, // Creator is the first member
      postCount: 0,
      color,
      createdAt: timestamp,
      updatedAt: timestamp,
      isModerated: true,
      moderationStatus: isSafe ? "approved" : "pending",
      rules,
      tags: [category, genre],
    }

    // Save loop to database
    await set(newLoopRef, newLoop)

    // Add creator as admin member
    const membersRef = ref(db, `loop-members/${loopId}/${creatorId}`)
    await set(membersRef, {
      userId: creatorId,
      displayName: creatorName,
      role: "admin",
      joinedAt: timestamp,
    })

    // Add loop to user's loops
    const userLoopsRef = ref(db, `user-loops/${creatorId}/${loopId}`)
    await set(userLoopsRef, {
      role: "admin",
      joinedAt: timestamp,
    })

    // If content is not safe, log for moderation
    if (!isSafe) {
      const moderationRef = ref(db, "moderation-logs")
      const newModerationRef = push(moderationRef)
      await set(newModerationRef, {
        type: "loop",
        loopId,
        content: `Loop Name: ${name}\nDescription: ${description}`,
        result: {
          isSafe,
          nameResult: nameModeration,
          descriptionResult: descriptionModeration,
        },
        timestamp,
        reviewed: false,
        actionTaken: false,
      })
    }

    return newLoop
  } catch (error) {
    console.error("Error creating loop:", error)
    throw error
  }
}

// Get a loop by ID
export async function getLoop(loopId: string): Promise<Loop | null> {
  try {
    const loopRef = ref(db, `loops/${loopId}`)
    const snapshot = await get(loopRef)

    if (snapshot.exists()) {
      return { id: snapshot.key as string, ...snapshot.val() } as Loop
    }

    return null
  } catch (error) {
    console.error("Error getting loop:", error)
    return null
  }
}

// Update a loop
export async function updateLoop(loopId: string, updates: Partial<Loop>): Promise<void> {
  try {
    const loopRef = ref(db, `loops/${loopId}`)

    // If name is updated, update nameLower as well
    if (updates.name) {
      updates.nameLower = updates.name.toLowerCase()
    }

    // If updating content, moderate it
    if (updates.name || updates.description) {
      const [nameModeration, descriptionModeration] = await Promise.all([
        updates.name ? moderateContent(updates.name) : Promise.resolve({ isSafe: true }),
        updates.description ? moderateContent(updates.description) : Promise.resolve({ isSafe: true }),
      ])

      const isSafe = nameModeration.isSafe && descriptionModeration.isSafe

      // If content is not safe, log for moderation
      if (!isSafe) {
        updates.moderationStatus = "pending"

        const moderationRef = ref(db, "moderation-logs")
        const newModerationRef = push(moderationRef)
        await set(newModerationRef, {
          type: "loop-update",
          loopId,
          content: `Loop Name: ${updates.name || ""}\nDescription: ${updates.description || ""}`,
          result: {
            isSafe,
            nameResult: nameModeration,
            descriptionResult: descriptionModeration,
          },
          timestamp: Date.now(),
          reviewed: false,
          actionTaken: false,
        })
      }
    }

    await update(loopRef, {
      ...updates,
      updatedAt: Date.now(),
    })
  } catch (error) {
    console.error("Error updating loop:", error)
    throw error
  }
}

// Join a loop
export async function joinLoop(loopId: string, userId: string, displayName: string, photoURL?: string): Promise<void> {
  try {
    const timestamp = Date.now()

    // Add user as member
    const memberRef = ref(db, `loop-members/${loopId}/${userId}`)
    await set(memberRef, {
      userId,
      displayName,
      photoURL,
      role: "member",
      joinedAt: timestamp,
    })

    // Add loop to user's loops
    const userLoopRef = ref(db, `user-loops/${userId}/${loopId}`)
    await set(userLoopRef, {
      role: "member",
      joinedAt: timestamp,
    })

    // Increment member count
    const loopRef = ref(db, `loops/${loopId}`)
    const snapshot = await get(loopRef)

    if (snapshot.exists()) {
      const loop = snapshot.val() as Loop
      await update(loopRef, {
        memberCount: (loop.memberCount || 0) + 1,
        updatedAt: timestamp,
      })
    }
  } catch (error) {
    console.error("Error joining loop:", error)
    throw error
  }
}

// Leave a loop
export async function leaveLoop(loopId: string, userId: string): Promise<void> {
  try {
    // Remove user from members
    const memberRef = ref(db, `loop-members/${loopId}/${userId}`)
    await set(memberRef, null)

    // Remove loop from user's loops
    const userLoopRef = ref(db, `user-loops/${userId}/${loopId}`)
    await set(userLoopRef, null)

    // Decrement member count
    const loopRef = ref(db, `loops/${loopId}`)
    const snapshot = await get(loopRef)

    if (snapshot.exists()) {
      const loop = snapshot.val() as Loop
      await update(loopRef, {
        memberCount: Math.max((loop.memberCount || 0) - 1, 0),
        updatedAt: Date.now(),
      })
    }
  } catch (error) {
    console.error("Error leaving loop:", error)
    throw error
  }
}

// Create a post in a loop
export async function createLoopPost(
  loopId: string,
  content: string,
  authorId: string,
  authorName: string,
  authorPhotoURL?: string,
  mediaFiles?: File[],
): Promise<LoopPost> {
  try {
    // Moderate content
    const contentModeration = await moderateContent(content)

    // Analyze sentiment
    const sentiment = await analyzeSentiment(content)

    const timestamp = Date.now()

    // Generate a new post ID
    const postsRef = ref(db, `loop-posts/${loopId}`)
    const newPostRef = push(postsRef)
    const postId = newPostRef.key as string

    // Handle media files (simplified - in a real app, you'd upload to storage)
    const mediaURLs: string[] = []
    const mediaTypes: string[] = []

    if (mediaFiles && mediaFiles.length > 0) {
      // This is a placeholder - in a real app, you'd upload files to Firebase Storage
      mediaFiles.forEach((file) => {
        mediaURLs.push(`https://example.com/media/${postId}/${file.name}`)
        mediaTypes.push(file.type.startsWith("image/") ? "image" : "video")
      })
    }

    // Create post object
    const newPost: LoopPost = {
      id: postId,
      loopId,
      content,
      authorId,
      authorName,
      authorPhotoURL,
      createdAt: timestamp,
      updatedAt: timestamp,
      likesCount: 0,
      commentsCount: 0,
      mediaURLs: mediaURLs.length > 0 ? mediaURLs : undefined,
      mediaTypes: mediaTypes.length > 0 ? mediaTypes : undefined,
      sentiment,
      isSafe: contentModeration.isSafe,
      moderationStatus: contentModeration.isSafe ? "approved" : "pending",
    }

    // Save post to database
    await set(newPostRef, newPost)

    // Increment post count in loop
    const loopRef = ref(db, `loops/${loopId}`)
    const loopSnapshot = await get(loopRef)

    if (loopSnapshot.exists()) {
      const loop = loopSnapshot.val() as Loop
      await update(loopRef, {
        postCount: (loop.postCount || 0) + 1,
        updatedAt: timestamp,
      })
    }

    // Add post to user's posts
    const userPostRef = ref(db, `user-posts/${authorId}/${postId}`)
    await set(userPostRef, {
      loopId,
      createdAt: timestamp,
    })

    // If content is not safe, log for moderation
    if (!contentModeration.isSafe) {
      const moderationRef = ref(db, "moderation-logs")
      const newModerationRef = push(moderationRef)
      await set(newModerationRef, {
        type: "loop-post",
        loopId,
        postId,
        authorId,
        content,
        result: contentModeration,
        timestamp,
        reviewed: false,
        actionTaken: false,
      })
    }

    return newPost
  } catch (error) {
    console.error("Error creating loop post:", error)
    throw error
  }
}

// Get loop posts
export async function getLoopPosts(loopId: string, limit = 20): Promise<LoopPost[]> {
  try {
    // Check if user is authenticated
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("Authentication required to fetch posts")
    }

    // Check if user is a member of the loop
    const memberRef = ref(db, `loop-members/${loopId}/${currentUser.uid}`)
    const memberSnapshot = await get(memberRef)
    
    if (!memberSnapshot.exists()) {
      throw new Error("You must be a member of this loop to view posts")
    }

    const postsRef = ref(db, `loop-posts/${loopId}`)
    const postsQuery = query(postsRef, orderByChild("createdAt"))
    const snapshot = await get(postsQuery)

    if (!snapshot.exists()) return []

    const posts: LoopPost[] = []
    snapshot.forEach((childSnapshot) => {
      const post = {
        id: childSnapshot.key,
        ...childSnapshot.val()
      } as LoopPost
      posts.unshift(post) // Add to beginning to get reverse chronological order
    })

    return posts.slice(0, limit)
  } catch (error) {
    console.error("Error fetching loop posts:", error)
    throw error
  }
}

// Get loops by genre
export async function getLoopsByGenre(genre: string, limit = 10): Promise<Loop[]> {
  try {
    const loopsRef = ref(db, "loops")
    const loopsQuery = query(loopsRef, orderByChild("genre"), equalTo(genre))
    const snapshot = await get(loopsQuery)

    if (!snapshot.exists()) return []

    const loops: Loop[] = []
    snapshot.forEach((childSnapshot) => {
      loops.push({
        id: childSnapshot.key as string,
        ...childSnapshot.val(),
      } as Loop)
    })

    // Sort by memberCount in descending order (most popular first)
    return loops.sort((a, b) => b.memberCount - a.memberCount).slice(0, limit)
  } catch (error) {
    console.error("Error getting loops by genre:", error)
    return []
  }
}

// Get trending loops
export async function getTrendingLoops(limit = 10): Promise<Loop[]> {
  try {
    const loopsRef = ref(db, "loops")
    const snapshot = await get(loopsRef)

    if (!snapshot.exists()) return []

    const loops: Loop[] = []
    snapshot.forEach((childSnapshot) => {
      loops.push({
        id: childSnapshot.key as string,
        ...childSnapshot.val(),
      } as Loop)
    })

    // Sort by a combination of recency and popularity
    return loops
      .sort((a, b) => {
        // Calculate a score based on member count and recency
        const scoreA = a.memberCount * 0.7 + (Date.now() - a.updatedAt) * 0.3
        const scoreB = b.memberCount * 0.7 + (Date.now() - b.updatedAt) * 0.3
        return scoreB - scoreA
      })
      .slice(0, limit)
  } catch (error) {
    console.error("Error getting trending loops:", error)
    return []
  }
}

// Subscribe to a loop's updates
export function subscribeToLoop(loopId: string, callback: (loop: Loop | null) => void): () => void {
  const loopRef = ref(db, `loops/${loopId}`)

  const handleSnapshot = (snapshot: any) => {
    if (snapshot.exists()) {
      callback({
        id: snapshot.key,
        ...snapshot.val(),
      } as Loop)
    } else {
      callback(null)
    }
  }

  onValue(loopRef, handleSnapshot)

  // Return unsubscribe function
  return () => off(loopRef, "value", handleSnapshot)
}

// Subscribe to a loop's posts
export function subscribeToLoopPosts(loopId: string, callback: (posts: LoopPost[]) => void, limit = 20): () => void {
  const postsRef = ref(db, `loop-posts/${loopId}`)

  const handleSnapshot = (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const posts: LoopPost[] = []
    snapshot.forEach((childSnapshot: any) => {
      posts.push({
        id: childSnapshot.key,
        ...childSnapshot.val(),
      } as LoopPost)
    })

    // Sort by createdAt in descending order (newest first)
    callback(posts.sort((a: LoopPost, b: LoopPost) => b.createdAt - a.createdAt).slice(0, limit))
  }

  onValue(postsRef, handleSnapshot)

  // Return unsubscribe function
  return () => off(postsRef, "value", handleSnapshot)
}

// Get user's loops
export async function getUserLoops(userId: string): Promise<{ loop: Loop; role: string }[]> {
  try {
    const userLoopsRef = ref(db, `user-loops/${userId}`)
    const snapshot = await get(userLoopsRef)

    if (!snapshot.exists()) return []

    const loopPromises: Promise<{ loop: Loop; role: string } | null>[] = []

    snapshot.forEach((childSnapshot) => {
      const loopId = childSnapshot.key as string
      const userLoopData = childSnapshot.val()

      loopPromises.push(
        getLoop(loopId).then((loop) => {
          if (loop) {
            return {
              loop,
              role: userLoopData.role,
            }
          }
          return null
        }),
      )
    })

    const results = await Promise.all(loopPromises)
    return results.filter(Boolean) as { loop: Loop; role: string }[]
  } catch (error) {
    console.error("Error getting user loops:", error)
    return []
  }
}

// Search loops
export async function searchLoops(query: string, limit = 10): Promise<Loop[]> {
  try {
    const loopsRef = ref(db, "loops")
    const snapshot = await get(loopsRef)

    if (!snapshot.exists()) return []

    const loops: Loop[] = []
    const lowerQuery = query.toLowerCase()

    snapshot.forEach((childSnapshot) => {
      const loop = childSnapshot.val() as Loop
      loop.id = childSnapshot.key as string

      // Check if loop name or description contains the query
      if (
        loop.nameLower.includes(lowerQuery) ||
        loop.description.toLowerCase().includes(lowerQuery) ||
        loop.category.toLowerCase().includes(lowerQuery) ||
        loop.genre.toLowerCase().includes(lowerQuery)
      ) {
        loops.push(loop)
      }
    })

    // Sort by relevance (exact matches first, then starts with, then contains)
    return loops
      .sort((a, b) => {
        // Exact match in name
        if (a.nameLower === lowerQuery && b.nameLower !== lowerQuery) return -1
        if (b.nameLower === lowerQuery && a.nameLower !== lowerQuery) return 1

        // Starts with in name
        if (a.nameLower.startsWith(lowerQuery) && !b.nameLower.startsWith(lowerQuery)) return -1
        if (b.nameLower.startsWith(lowerQuery) && !a.nameLower.startsWith(lowerQuery)) return 1

        // Sort by member count as a tiebreaker
        return b.memberCount - a.memberCount
      })
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching loops:", error)
    return []
  }
}

