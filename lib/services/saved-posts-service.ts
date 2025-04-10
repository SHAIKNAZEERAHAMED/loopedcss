import { db } from "@/lib/firebase/config"
import { collection, doc, setDoc, deleteDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore"

export async function savePost(userId: string, postId: string) {
  try {
    const savedPostRef = doc(db, "savedPosts", `${userId}_${postId}`)
    await setDoc(savedPostRef, {
      userId,
      postId,
      savedAt: serverTimestamp(),
    })
    return true
  } catch (error) {
    console.error("Error saving post:", error)
    return false
  }
}

export async function unsavePost(userId: string, postId: string) {
  try {
    const savedPostRef = doc(db, "savedPosts", `${userId}_${postId}`)
    await deleteDoc(savedPostRef)
    return true
  } catch (error) {
    console.error("Error unsaving post:", error)
    return false
  }
}

export async function isPostSaved(userId: string, postId: string) {
  try {
    const savedPostRef = doc(db, "savedPosts", `${userId}_${postId}`)
    const savedPostDoc = await getDocs(
      query(collection(db, "savedPosts"), where("userId", "==", userId), where("postId", "==", postId)),
    )
    return !savedPostDoc.empty
  } catch (error) {
    console.error("Error checking if post is saved:", error)
    return false
  }
}

export async function getSavedPosts(userId: string) {
  try {
    const savedPostsQuery = query(collection(db, "savedPosts"), where("userId", "==", userId))

    const savedPostsSnapshot = await getDocs(savedPostsQuery)
    return savedPostsSnapshot.docs.map((doc) => doc.data())
  } catch (error) {
    console.error("Error getting saved posts:", error)
    return []
  }
}

