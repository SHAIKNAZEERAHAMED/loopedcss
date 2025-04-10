import { db } from "./firebase/config"
import { ref, get, set } from "firebase/database"

// List of Indian festivals with dates and themes
export const INDIAN_FESTIVALS = [
  {
    id: "diwali",
    name: "Diwali",
    date: "2023-11-12", // Update with current year
    description: "Festival of Lights",
    theme: {
      primary: "#FFA500", // Orange
      secondary: "#FFD700", // Gold
      accent: "#FF4500", // Red-Orange
      background: "linear-gradient(135deg, #FFA500 0%, #FF4500 100%)",
      icon: "🪔",
    },
  },
  {
    id: "holi",
    name: "Holi",
    date: "2024-03-25", // Update with current year
    description: "Festival of Colors",
    theme: {
      primary: "#FF1493", // Deep Pink
      secondary: "#00BFFF", // Deep Sky Blue
      accent: "#32CD32", // Lime Green
      background: "linear-gradient(135deg, #FF1493 0%, #00BFFF 50%, #32CD32 100%)",
      icon: "🎨",
    },
  },
  {
    id: "independence-day",
    name: "Independence Day",
    date: "2023-08-15", // Update with current year
    description: "Celebration of Freedom",
    theme: {
      primary: "#FF9933", // Saffron
      secondary: "#FFFFFF", // White
      accent: "#138808", // Green
      background: "linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)",
      icon: "🇮🇳",
    },
  },
  {
    id: "republic-day",
    name: "Republic Day",
    date: "2024-01-26", // Update with current year
    description: "Celebration of Constitution",
    theme: {
      primary: "#FF9933", // Saffron
      secondary: "#FFFFFF", // White
      accent: "#138808", // Green
      background: "linear-gradient(135deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)",
      icon: "🇮🇳",
    },
  },
  {
    id: "navratri",
    name: "Navratri",
    date: "2023-10-15", // Update with current year
    description: "Nine Nights Festival",
    theme: {
      primary: "#FF0000", // Red
      secondary: "#FFA500", // Orange
      accent: "#FFFF00", // Yellow
      background: "linear-gradient(135deg, #FF0000 0%, #FFA500 50%, #FFFF00 100%)",
      icon: "💃",
    },
  },
]

/**
 * Get the current or upcoming festival
 */
export async function getCurrentFestival() {
  try {
    // Get current date
    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]

    // Find the current festival or the next upcoming one
    let currentFestival = null
    let nextFestival = null
    let minDaysDiff = Number.POSITIVE_INFINITY

    for (const festival of INDIAN_FESTIVALS) {
      const festivalDate = new Date(festival.date)
      const daysDiff = Math.floor((festivalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // If festival is today or within 7 days before (still celebrating)
      if (festival.date === todayStr || (daysDiff >= -7 && daysDiff <= 0)) {
        currentFestival = festival
        break
      }

      // Find the next upcoming festival
      if (daysDiff > 0 && daysDiff < minDaysDiff) {
        minDaysDiff = daysDiff
        nextFestival = festival
      }
    }

    return currentFestival || nextFestival
  } catch (error) {
    console.error("Error getting current festival:", error)
    return null
  }
}

/**
 * Get user's festival mode preference
 */
export async function getFestivalModePreference(userId: string): Promise<boolean> {
  try {
    const prefRef = ref(db, `users/${userId}/preferences/festivalMode`)
    const snapshot = await get(prefRef)

    return snapshot.exists() ? snapshot.val() : true // Default to enabled
  } catch (error) {
    console.error("Error getting festival mode preference:", error)
    return true // Default to enabled
  }
}

/**
 * Set user's festival mode preference
 */
export async function setFestivalModePreference(userId: string, enabled: boolean): Promise<void> {
  try {
    const prefRef = ref(db, `users/${userId}/preferences/festivalMode`)
    await set(prefRef, enabled)
  } catch (error) {
    console.error("Error setting festival mode preference:", error)
    throw error
  }
}

/**
 * Get festival-specific posts
 */
export async function getFestivalPosts(festivalId: string) {
  try {
    const postsRef = ref(db, "posts")
    const snapshot = await get(postsRef)

    if (!snapshot.exists()) return []

    const festivalPosts = []

    snapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val()

      // Check if post has festival tag
      if (post.tags && post.tags.includes(festivalId)) {
        festivalPosts.push({
          id: childSnapshot.key,
          ...post,
        })
      }
    })

    return festivalPosts
  } catch (error) {
    console.error("Error getting festival posts:", error)
    return []
  }
}


