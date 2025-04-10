import { db } from "@/lib/firebase/config"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"

export interface Notification {
  userId: string
  type: "like" | "comment" | "follow" | "mention" | "system"
  message: string
  sourceId?: string
  sourceType?: "post" | "comment" | "user"
  sourceUserId?: string
  read: boolean
  createdAt: any
}

export async function createNotification(notification: Omit<Notification, "read" | "createdAt">): Promise<string> {
  try {
    const notificationData: Notification = {
      ...notification,
      read: false,
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "notifications"), notificationData)
    return docRef.id
  } catch (error) {
    console.error("Error creating notification:", error)
    throw error
  }
}

