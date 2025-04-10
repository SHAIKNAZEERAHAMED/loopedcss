import { db } from "./firebase/config"
import {
  ref,
  query,
  orderByChild,
  limitToLast,
  get,
  set,
  update,
  onValue,
  off,
  startAfter,
  endBefore,
} from "firebase/database"
import { LoopPost } from "./loop-service"
import { User } from "./user-service"
import { safeGet, safeSet, safeUpdate } from "./db-helpers"

export interface FeedItem extends LoopPost {
  feedId: string
  timestamp: number
  userId: string
  user?: User
}

export interface FeedOptions {
  limit?: number
  beforeTimestamp?: number
  afterTimestamp?: number
}

const DEFAULT_FEED_LIMIT = 20

// Function to get user's feed items with pagination
export async function getFeedItems(
  userId: string,
  options: FeedOptions = {}
): Promise<FeedItem[]> {
  try {
    const {
      limit = DEFAULT_FEED_LIMIT,
      beforeTimestamp,
      afterTimestamp,
    } = options

    const feedRef = ref(db, `feeds/${userId}`)
    let feedQuery = query(feedRef, orderByChild("timestamp"))

    if (beforeTimestamp) {
      feedQuery = query(feedQuery, endBefore(beforeTimestamp))
    } else if (afterTimestamp) {
      feedQuery = query(feedQuery, startAfter(afterTimestamp))
    }

    feedQuery = query(feedQuery, limitToLast(limit))
    const snapshot = await get(feedQuery)

    if (!snapshot.exists()) {
      return []
    }

    const feedItems: FeedItem[] = []
    const userPromises: Promise<void>[] = []

    snapshot.forEach((child) => {
      const item = child.val() as FeedItem
      item.feedId = child.key || ""
      feedItems.push(item)

      // Fetch user data for each feed item
      const userPromise = safeGet(`users/${item.userId}`).then((userSnapshot) => {
        if (userSnapshot.exists()) {
          item.user = userSnapshot.val() as User
        }
      })
      userPromises.push(userPromise)
    })

    // Wait for all user data to be fetched
    await Promise.all(userPromises)

    // Sort by timestamp in descending order (newest first)
    return feedItems.sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    console.error("Error getting feed items:", error)
    throw error
  }
}

// Function to subscribe to feed updates
export function subscribeFeed(
  userId: string,
  callback: (items: FeedItem[]) => void,
  options: FeedOptions = {}
): () => void {
  const { limit = DEFAULT_FEED_LIMIT } = options
  const feedRef = ref(db, `feeds/${userId}`)
  const feedQuery = query(feedRef, orderByChild("timestamp"), limitToLast(limit))

  const onFeedUpdate = onValue(
    feedQuery,
    async (snapshot) => {
      if (!snapshot.exists()) {
        callback([])
        return
      }

      const feedItems: FeedItem[] = []
      const userPromises: Promise<void>[] = []

      snapshot.forEach((child) => {
        const item = child.val() as FeedItem
        item.feedId = child.key || ""
        feedItems.push(item)

        // Fetch user data for each feed item
        const userPromise = safeGet(`users/${item.userId}`).then((userSnapshot) => {
          if (userSnapshot.exists()) {
            item.user = userSnapshot.val() as User
          }
        })
        userPromises.push(userPromise)
      })

      // Wait for all user data to be fetched
      await Promise.all(userPromises)

      // Sort by timestamp in descending order (newest first)
      callback(feedItems.sort((a, b) => b.timestamp - a.timestamp))
    },
    (error) => {
      console.error("Error subscribing to feed:", error)
      callback([])
    }
  )

  // Return unsubscribe function
  return () => off(feedRef, "value", onFeedUpdate)
}

// Function to add an item to a user's feed
export async function addFeedItem(
  userId: string,
  post: LoopPost
): Promise<string> {
  try {
    const feedItem: Omit<FeedItem, "feedId"> = {
      ...post,
      timestamp: Date.now(),
      userId: post.authorId || userId,
    }

    const feedRef = ref(db, `feeds/${userId}`)
    const newItemRef = await safeSet(`feeds/${userId}/${post.id}`, feedItem)
    return post.id
  } catch (error) {
    console.error("Error adding feed item:", error)
    throw error
  }
}

// Function to remove an item from a user's feed
export async function removeFeedItem(
  userId: string,
  feedId: string
): Promise<void> {
  try {
    await safeUpdate(`feeds/${userId}/${feedId}`, null)
  } catch (error) {
    console.error("Error removing feed item:", error)
    throw error
  }
}

// Function to clear a user's feed
export async function clearFeed(userId: string): Promise<void> {
  try {
    await safeSet(`feeds/${userId}`, null)
  } catch (error) {
    console.error("Error clearing feed:", error)
    throw error
  }
}

// Function to update a feed item
export async function updateFeedItem(
  userId: string,
  feedId: string,
  updates: Partial<FeedItem>
): Promise<void> {
  try {
    await safeUpdate(`feeds/${userId}/${feedId}`, updates)
  } catch (error) {
    console.error("Error updating feed item:", error)
    throw error
  }
} 