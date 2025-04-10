import { ref, set, get, update, push, query, orderByChild, limitToLast } from "firebase/database"
import { db } from "./firebase/config"

// Helper function to safely set data without undefined values
export async function safeSet(path: string, data: any) {
  // Remove undefined values from objects recursively
  const cleanData = removeUndefined(data)
  const reference = ref(db, path)
  return set(reference, cleanData)
}

// Helper function to safely update data without undefined values
export async function safeUpdate(path: string, data: any) {
  const cleanData = removeUndefined(data)
  const reference = ref(db, path)
  return update(reference, cleanData)
}

// Helper function to safely push data without undefined values
export async function safePush(path: string, data: any) {
  const cleanData = removeUndefined(data)
  const reference = ref(db, path)
  const newRef = push(reference)
  await set(newRef, cleanData)
  return newRef
}

// Helper function to create safe indices
export async function createIndex(path: string, field: string) {
  try {
    // Don't use dots in index paths - use proper Firebase paths
    const indexPath = `indices/${path.replace(/\//g, "_")}_${field}`
    const reference = ref(db, indexPath)
    await set(reference, {
      path: path,
      field: field,
      active: true,
    })
    return true
  } catch (error) {
    console.error("Error creating index:", error)
    return false
  }
}

// Function to remove undefined values from objects recursively
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null
  }

  if (typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter((item) => item !== null && item !== undefined)
  }

  const cleanObj: Record<string, any> = {}

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = removeUndefined(obj[key])
      if (value !== undefined && value !== null) {
        cleanObj[key] = value
      }
    }
  }

  return cleanObj
}

// Function to safely query data
export async function safeQuery(path: string, orderBy: string, limit: number) {
  const reference = ref(db, path)
  const queryRef = query(reference, orderByChild(orderBy), limitToLast(limit))
  return get(queryRef)
}

// Function to safely get data
export async function safeGet(path: string) {
  const reference = ref(db, path)
  return get(reference)
}

