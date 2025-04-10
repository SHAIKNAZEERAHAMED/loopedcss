import type { ContentCategory } from "@/lib/services/content-diversity-service"

export interface User {
  id: string
  username: string
  displayName: string
  email: string
  bio?: string
  photoURL?: string
  coverPhotoURL?: string
  following: string[]
  followers: string[]
  createdAt: any // Firestore timestamp
  location?: string
  website?: string
  isVerified?: boolean
}

export interface UserPreferences {
  following: string[]
  location: string
  interests: ContentCategory[]
}

