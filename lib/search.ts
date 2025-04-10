import { db } from "./firebase/config"
import { ref, get, query, orderByChild, startAt, endAt, limitToFirst } from "firebase/database"

export interface SearchResult {
  id: string
  type: "user" | "loop" | "post"
  [key: string]: any
}

export async function searchUsers(searchTerm: string, maxResults = 10): Promise<SearchResult[]> {
  try {
    const searchTermLower = searchTerm.toLowerCase()

    // Create a query to search for users by displayNameLower
    const usersRef = ref(db, "users")
    const userQuery = query(
      usersRef,
      orderByChild("displayNameLower"),
      startAt(searchTermLower),
      endAt(searchTermLower + "\uf8ff"),
      limitToFirst(maxResults),
    )

    const snapshot = await get(userQuery)

    if (!snapshot.exists()) return []

    const results: SearchResult[] = []

    snapshot.forEach((childSnapshot) => {
      const userData = childSnapshot.val()
      results.push({
        id: childSnapshot.key as string,
        type: "user",
        ...userData,
      })
    })

    return results
  } catch (error) {
    console.error("Error searching users:", error)
    return []
  }
}

export async function searchLoops(searchTerm: string, maxResults = 10): Promise<SearchResult[]> {
  try {
    const searchTermLower = searchTerm.toLowerCase()

    // Create a query to search for loops by nameLower
    const loopsRef = ref(db, "loops")
    const loopQuery = query(
      loopsRef,
      orderByChild("nameLower"),
      startAt(searchTermLower),
      endAt(searchTermLower + "\uf8ff"),
      limitToFirst(maxResults),
    )

    const snapshot = await get(loopQuery)

    if (!snapshot.exists()) return []

    const results: SearchResult[] = []

    snapshot.forEach((childSnapshot) => {
      const loopData = childSnapshot.val()
      results.push({
        id: childSnapshot.key as string,
        type: "loop",
        ...loopData,
      })
    })

    return results
  } catch (error) {
    console.error("Error searching loops:", error)
    return []
  }
}

export async function searchPosts(searchTerm: string, maxResults = 10): Promise<SearchResult[]> {
  try {
    const searchTermLower = searchTerm.toLowerCase()

    // Create a query to search for posts by contentLower
    const postsRef = ref(db, "posts")
    const postQuery = query(
      postsRef,
      orderByChild("contentLower"),
      startAt(searchTermLower),
      endAt(searchTermLower + "\uf8ff"),
      limitToFirst(maxResults),
    )

    const snapshot = await get(postQuery)

    if (!snapshot.exists()) return []

    const results: SearchResult[] = []

    snapshot.forEach((childSnapshot) => {
      const postData = childSnapshot.val()
      results.push({
        id: childSnapshot.key as string,
        type: "post",
        ...postData,
      })
    })

    return results
  } catch (error) {
    console.error("Error searching posts:", error)
    return []
  }
}

export async function searchAll(searchTerm: string, maxResults = 5): Promise<SearchResult[]> {
  try {
    // Search across all collections
    const [users, loops, posts] = await Promise.all([
      searchUsers(searchTerm, maxResults),
      searchLoops(searchTerm, maxResults),
      searchPosts(searchTerm, maxResults),
    ])

    // Combine and sort results
    const allResults = [...users, ...loops, ...posts]

    // Sort by relevance (simple implementation - could be improved)
    const sortedResults = allResults.sort((a, b) => {
      // Prioritize exact matches
      const aName = a.displayName || a.name || a.content || ""
      const bName = b.displayName || b.name || b.content || ""

      const aExact = aName.toLowerCase() === searchTerm.toLowerCase()
      const bExact = bName.toLowerCase() === searchTerm.toLowerCase()

      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      // Then prioritize starts with
      const aStartsWith = aName.toLowerCase().startsWith(searchTerm.toLowerCase())
      const bStartsWith = bName.toLowerCase().startsWith(searchTerm.toLowerCase())

      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1

      return 0
    })

    // Limit total results
    return sortedResults.slice(0, maxResults * 3)
  } catch (error) {
    console.error("Error searching all collections:", error)
    return []
  }
}


