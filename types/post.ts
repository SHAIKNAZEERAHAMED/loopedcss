export interface Post {
  id: string
  text?: string
  media?: {
    url: string
    type: "image" | "video" | "audio"
  }[]
  authorId: string
  author?: {
    id: string
    username: string
    displayName: string
    photoURL?: string
    isVerified?: boolean
  }
  createdAt: any // Firestore timestamp
  likes: string[] // Array of user IDs
  comments: number
  shares: number
  hashtags?: string[]
  mentions?: string[]
  language?: "english" | "telugu" | "tenglish" | "other"
  location?: string
  isPaid?: boolean
  isModerated?: boolean
  moderationStatus?: "approved" | "pending" | "rejected"
  moderationReason?: string
  categories?: string[]
}

