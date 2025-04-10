import { db, storage } from "./firebase/config"
import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  startAt,
  endAt,
  equalTo,
  limitToFirst,
  Database,
} from "firebase/database"
import { ref as storageRef, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage"
import type { User as FirebaseUser } from "firebase/auth"
import { v4 as uuidv4 } from "uuid"

export interface User {
  uid: string
  email: string
  displayName: string
  displayNameLower?: string
  username?: string
  usernameLower?: string
  photoURL?: string
  coverPhotoURL?: string
  bio?: string
  location?: string
  website?: string
  followersCount?: number
  followingCount?: number
  postsCount?: number
  status?: "online" | "offline" | "away"
  lastActive?: number
  createdAt?: string
  updatedAt?: string
  isProfileComplete?: boolean
}

export async function createUser(user: FirebaseUser): Promise<void> {
  if (!db) throw new Error("Firebase Database not initialized")
  const database = db as Database
  
  const { uid, email, displayName, photoURL } = user

  const newUser: User = {
    uid,
    email: email || "",
    displayName: displayName || email?.split("@")[0] || "User",
    displayNameLower: (displayName || email?.split("@")[0] || "User").toLowerCase(),
    photoURL: photoURL || "",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    status: "online",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isProfileComplete: false,
  }

  // Set user data in the Realtime Database
  await set(ref(database, `users/${uid}`), newUser)
}

export async function updateUserStatus(uid: string, status: "online" | "offline" | "away"): Promise<void> {
  if (!db) throw new Error("Firebase Database not initialized")
  const database = db as Database
  
  try {
    const userRef = ref(database, `users/${uid}`)
    await update(userRef, { status, lastActive: Date.now() })
  } catch (error) {
    console.error("Error updating user status:", error)
    throw error
  }
}

export async function getUser(uid: string): Promise<User | null> {
  if (!db) throw new Error("Firebase Database not initialized")
  const database = db as Database
  
  try {
    const userRef = ref(database, `users/${uid}`)
    const snapshot = await get(userRef)

    if (snapshot.exists()) {
      return snapshot.val() as User
    }

    return null
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export function subscribeToUser(uid: string, callback: (User: User | null) => void): () => void {
  if (!db) {
    console.error("Firebase Database not initialized")
    callback(null)
    return () => {}
  }
  const database = db as Database
  
  const userRef = ref(database, `users/${uid}`)

  const onUserChange = onValue(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as User)
      } else {
        callback(null)
      }
    },
    (error) => {
      console.error("Error subscribing to user:", error)
      callback(null)
    },
  )

  // Return unsubscribe function
  return () => off(userRef, "value", onUserChange)
}

export async function updateUser(uid: string, updates: Partial<User>): Promise<void> {
  if (!db) throw new Error("Firebase Database not initialized")
  const database = db as Database
  
  try {
    const userRef = ref(database, `users/${uid}`)

    // Add updated timestamp
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    // If displayName is being updated, also update displayNameLower
    if (updates.displayName) {
      updatedData.displayNameLower = updates.displayName.toLowerCase()
    }

    // If username is being updated, also update usernameLower
    if (updates.username) {
      updatedData.usernameLower = updates.username.toLowerCase()
    }

    await update(userRef, updatedData)
  } catch (error) {
    console.error("Error updating user:", error)
    throw error
  }
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  if (!db) throw new Error("Firebase Database not initialized")
  const database = db as Database
  
  try {
    if (!username || username.length < 3) {
      return false
    }

    const usernameLower = username.toLowerCase()

    // Method 1: Try to use the index-based query first
    try {
      const usersRef = ref(database, "users")
      const usernameQuery = query(usersRef, orderByChild("usernameLower"), equalTo(usernameLower))

      const snapshot = await get(usernameQuery)
      return !snapshot.exists()
    } catch (indexError) {
      console.warn("Index-based query failed, falling back to manual check:", indexError)

      // Method 2: Fallback to a full scan if the index isn't available
      // This is less efficient but will work without the index
      const allUsersRef = ref(database, "users")
      const allUsersSnapshot = await get(allUsersRef)

      if (!allUsersSnapshot.exists()) {
        return true // No users exist yet, so username is available
      }

      // Manually check if any user has this username
      let isAvailable = true
      allUsersSnapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val()
        if (userData.usernameLower === usernameLower) {
          isAvailable = false
          return true // Break the forEach loop
        }
        return false // Continue the forEach loop
      })

      return isAvailable
    }
  } catch (error) {
    console.error("Error checking username availability:", error)
    throw error
  }
}

export async function uploadProfileImage(user: FirebaseUser, file: File): Promise<string> {
  if (!storage) throw new Error("Firebase Storage not initialized")
  const firebaseStorage = storage as FirebaseStorage
  
  try {
    const fileExtension = file.name.split(".").pop()
    const fileName = `profile_${user.uid}_${uuidv4()}.${fileExtension}`
    const profileImageRef = storageRef(firebaseStorage, `users/${user.uid}/profile/${fileName}`)

    await uploadBytes(profileImageRef, file)
    const downloadURL = await getDownloadURL(profileImageRef)

    return downloadURL
  } catch (error) {
    console.error("Error uploading profile image:", error)
    throw error
  }
}

export async function uploadCoverImage(user: FirebaseUser, file: File): Promise<string> {
  try {
    const fileExtension = file.name.split(".").pop()
    const fileName = `cover_${user.uid}_${uuidv4()}.${fileExtension}`
    const coverImageRef = storageRef(storage, `users/${user.uid}/cover/${fileName}`)

    await uploadBytes(coverImageRef, file)
    const downloadURL = await getDownloadURL(coverImageRef)

    return downloadURL
  } catch (error) {
    console.error("Error uploading cover image:", error)
    throw error
  }
}

export async function followUser(currentUserId: string, targetUserId: string): Promise<void> {
  try {
    // Add to following list
    await set(ref(db, `users/${currentUserId}/following/${targetUserId}`), true)

    // Add to followers list
    await set(ref(db, `users/${targetUserId}/followers/${currentUserId}`), true)

    // Update counts
    const [currentUser, targetUser] = await Promise.all([getUser(currentUserId), getUser(targetUserId)])

    if (currentUser) {
      await update(ref(db, `users/${currentUserId}`), {
        followingCount: (currentUser.followingCount || 0) + 1,
      })
    }

    if (targetUser) {
      await update(ref(db, `users/${targetUserId}`), {
        followersCount: (targetUser.followersCount || 0) + 1,
      })
    }
  } catch (error) {
    console.error("Error following user:", error)
    throw error
  }
}

export async function unfollowUser(currentUserId: string, targetUserId: string): Promise<void> {
  try {
    // Remove from following list
    await remove(ref(db, `users/${currentUserId}/following/${targetUserId}`))

    // Remove from followers list
    await remove(ref(db, `users/${targetUserId}/followers/${currentUserId}`))

    // Update counts
    const [currentUser, targetUser] = await Promise.all([getUser(currentUserId), getUser(targetUserId)])

    if (currentUser && currentUser.followingCount && currentUser.followingCount > 0) {
      await update(ref(db, `users/${currentUserId}`), {
        followingCount: currentUser.followingCount - 1,
      })
    }

    if (targetUser && targetUser.followersCount && targetUser.followersCount > 0) {
      await update(ref(db, `users/${targetUserId}`), {
        followersCount: targetUser.followersCount - 1,
      })
    }
  } catch (error) {
    console.error("Error unfollowing user:", error)
    throw error
  }
}

export async function isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
  try {
    const followingRef = ref(db, `users/${currentUserId}/following/${targetUserId}`)
    const snapshot = await get(followingRef)

    return snapshot.exists()
  } catch (error) {
    console.error("Error checking follow status:", error)
    return false
  }
}

export async function getFollowers(userId: string): Promise<User[]> {
  try {
    const followersRef = ref(db, `users/${userId}/followers`)
    const snapshot = await get(followersRef)

    if (!snapshot.exists()) return []

    const followerIds = Object.keys(snapshot.val())

    // Get user details for each follower
    const followers = await Promise.all(
      followerIds.map(async (followerId) => {
        const user = await getUser(followerId)
        return user as User
      }),
    )

    return followers.filter(Boolean)
  } catch (error) {
    console.error("Error getting followers:", error)
    return []
  }
}

export async function getFollowing(userId: string): Promise<User[]> {
  try {
    const followingRef = ref(db, `users/${userId}/following`)
    const snapshot = await get(followingRef)

    if (!snapshot.exists()) return []

    const followingIds = Object.keys(snapshot.val())

    // Get user details for each following
    const following = await Promise.all(
      followingIds.map(async (followingId) => {
        const user = await getUser(followingId)
        return user as User
      }),
    )

    return following.filter(Boolean)
  } catch (error) {
    console.error("Error getting following:", error)
    return []
  }
}

export async function searchUsers(queryText: string, limit = 10): Promise<User[]> {
  try {
    if (!queryText || queryText.length < 2) return []

    const lowerQuery = queryText.toLowerCase()

    // Search by display name
    const displayNameRef = ref(db, "users")
    const displayNameQuery = query(
      displayNameRef,
      orderByChild("displayNameLower"),
      startAt(lowerQuery),
      endAt(lowerQuery + "\uf8ff"),
      limitToFirst(limit)
    )

    // Search by username
    const usernameRef = ref(db, "users")
    const usernameQuery = query(
      usernameRef,
      orderByChild("usernameLower"),
      startAt(lowerQuery),
      endAt(lowerQuery + "\uf8ff"),
      limitToFirst(limit)
    )

    // Execute both queries
    const [displayNameSnapshot, usernameSnapshot] = await Promise.all([get(displayNameQuery), get(usernameQuery)])

    const results: User[] = []

    // Process display name results
    if (displayNameSnapshot.exists()) {
      displayNameSnapshot.forEach((childSnapshot) => {
        results.push(childSnapshot.val() as User)
      })
    }

    // Process username results and avoid duplicates
    if (usernameSnapshot.exists()) {
      usernameSnapshot.forEach((childSnapshot) => {
        const user = childSnapshot.val() as User
        if (!results.some((r) => r.uid === user.uid)) {
          results.push(user)
        }
      })
    }

    // Sort by relevance (exact matches first, then starts with)
    return results
      .sort((a, b) => {
        const aName = a.displayName.toLowerCase()
        const bName = b.displayName.toLowerCase()
        const aUsername = a.username?.toLowerCase() || ""
        const bUsername = b.username?.toLowerCase() || ""

        // Exact matches
        if (aName === lowerQuery && bName !== lowerQuery) return -1
        if (bName === lowerQuery && aName !== lowerQuery) return 1
        if (aUsername === lowerQuery && bUsername !== lowerQuery) return -1
        if (bUsername === lowerQuery && aUsername !== lowerQuery) return 1

        // Starts with
        if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1
        if (bName.startsWith(lowerQuery) && !aName.startsWith(lowerQuery)) return 1
        if (aUsername.startsWith(lowerQuery) && !bUsername.startsWith(lowerQuery)) return -1
        if (bUsername.startsWith(lowerQuery) && !aUsername.startsWith(lowerQuery)) return 1

        return 0
      })
      .slice(0, limit)
  } catch (error) {
    console.error("Error searching users:", error)
    return []
  }
}

export async function getUserProfile(uid: string): Promise<User | null> {
  if (!db) throw new Error("Firebase Database not initialized")
  const database = db as Database
  
  try {
    const userRef = ref(database, `users/${uid}`)
    const snapshot = await get(userRef)

    if (snapshot.exists()) {
      return snapshot.val() as User
    }

    return null
  } catch (error) {
    console.error("Error getting user profile:", error)
    return null
  }
}

