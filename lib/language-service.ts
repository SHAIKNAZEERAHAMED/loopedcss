import { ref, get } from "firebase/database"
import { db } from "./firebase/config"

interface UserLanguagePreference {
  language: string
  gender?: "male" | "female" | "other"
}

export async function getUserLanguagePreference(userId: string): Promise<UserLanguagePreference> {
  try {
    const userPrefsRef = ref(db, `users/${userId}/preferences`)
    const snapshot = await get(userPrefsRef)

    if (snapshot.exists()) {
      const prefs = snapshot.val()
      return {
        language: prefs.language || "english",
        gender: prefs.gender || "other",
      }
    }

    // Default preferences
    return {
      language: "english",
      gender: "other",
    }
  } catch (error) {
    console.error("Error getting user language preferences:", error)
    return {
      language: "english",
      gender: "other",
    }
  }
} 
