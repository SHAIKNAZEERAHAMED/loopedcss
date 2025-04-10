import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore"
import { db } from "./config"

export async function isLiked(postId: string, userId: string): Promise<boolean> {
  const postRef = doc(db, "posts", postId)
  const postDoc = await getDoc(postRef)
  
  if (!postDoc.exists()) {
    return false
  }

  const likes = postDoc.data().likes || []
  return likes.includes(userId)
}

export async function likePost(postId: string, userId: string): Promise<void> {
  const postRef = doc(db, "posts", postId)
  await updateDoc(postRef, {
    likes: arrayUnion(userId),
    likesCount: increment(1)
  })
}

export async function unlikePost(postId: string, userId: string): Promise<void> {
  const postRef = doc(db, "posts", postId)
  await updateDoc(postRef, {
    likes: arrayRemove(userId),
    likesCount: increment(-1)
  })
} 