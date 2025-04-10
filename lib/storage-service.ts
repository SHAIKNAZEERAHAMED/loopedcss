import { storage, db } from "./firebase/config"
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"
import { ref as dbRef, set, get, push } from "firebase/database"
import { v4 as uuidv4 } from "uuid"

// Upload an image to Firebase Storage and store its URL in Realtime Database
export async function uploadImageAndStoreURL(
  file: File,
  path: string,
  userId: string,
  category: "profile" | "post" | "cover",
): Promise<string> {
  try {
    // 1. Generate a unique filename
    const fileExtension = file.name.split(".").pop()
    const fileName = `${category}_${uuidv4()}.${fileExtension}`

    // 2. Create a reference to the storage location
    const imageRef = storageRef(storage, `${path}/${fileName}`)

    // 3. Upload the file to Firebase Storage
    await uploadBytes(imageRef, file)

    // 4. Get the download URL
    const downloadURL = await getDownloadURL(imageRef)

    // 5. Store the URL in Realtime Database
    const urlsRef = dbRef(db, `userMedia/${userId}/${category}`)

    if (category === "profile" || category === "cover") {
      // For profile/cover, store as a single value
      await set(urlsRef, downloadURL)
    } else {
      // For posts, store as a list
      const newUrlRef = push(urlsRef)
      await set(newUrlRef, {
        url: downloadURL,
        timestamp: Date.now(),
        fileName: fileName,
      })
    }

    return downloadURL
  } catch (error) {
    console.error(`Error uploading ${category} image:`, error)
    throw error
  }
}

// Get all media URLs for a specific user and category
export async function getUserMediaURLs(userId: string, category: "profile" | "post" | "cover"): Promise<string[]> {
  try {
    const urlsRef = dbRef(db, `userMedia/${userId}/${category}`)
    const snapshot = await get(urlsRef)

    if (!snapshot.exists()) return []

    if (category === "profile" || category === "cover") {
      // For profile/cover, it's a single value
      return [snapshot.val()]
    } else {
      // For posts, it's a list
      const urls: string[] = []
      snapshot.forEach((childSnapshot) => {
        urls.push(childSnapshot.val().url)
      })
      return urls
    }
  } catch (error) {
    console.error(`Error getting ${category} URLs:`, error)
    return []
  }
}

// Get the latest profile or cover image URL
export async function getLatestMediaURL(userId: string, category: "profile" | "cover"): Promise<string | null> {
  try {
    const urlRef = dbRef(db, `userMedia/${userId}/${category}`)
    const snapshot = await get(urlRef)

    if (snapshot.exists()) {
      return snapshot.val()
    }

    return null
  } catch (error) {
    console.error(`Error getting latest ${category} URL:`, error)
    return null
  }
}


