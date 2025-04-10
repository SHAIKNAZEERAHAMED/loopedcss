"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase/config"
import { onAuthStateChanged } from "firebase/auth"
import { ref, get } from "firebase/database"

export default function Debug() {
  const [authState, setAuthState] = useState<string>("Checking auth state...")
  const [dbState, setDbState] = useState<string>("Checking database connection...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check auth state
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          setAuthState(`Authenticated as ${user.email} (${user.uid})`)
          
          // Check database access
          const userRef = ref(db, `users/${user.uid}`)
          get(userRef)
            .then((snapshot) => {
              if (snapshot.exists()) {
                setDbState(`Database access successful. User data exists.`)
              } else {
                setDbState(`Database access successful. No user data found.`)
              }
            })
            .catch((error) => {
              setDbState(`Database error: ${error.message}`)
              setError(`Database error: ${error.message}`)
            })
        } else {
          setAuthState("Not authenticated")
          setDbState("Cannot check database without authentication")
        }
      },
      (error) => {
        setAuthState(`Auth error: ${error.message}`)
        setError(`Auth error: ${error.message}`)
      }
    )

    return () => unsubscribe()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <div className="mb-4 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Authentication State</h2>
        <p>{authState}</p>
      </div>
      
      <div className="mb-4 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Database State</h2>
        <p>{dbState}</p>
      </div>
      
      {error && (
        <div className="mb-4 p-4 border rounded bg-red-100">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Firebase Configuration</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify({
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Set" : "Not set",
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Set" : "Not set",
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Set" : "Not set",
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ? "Set" : "Not set",
          }, null, 2)}
        </pre>
      </div>
    </div>
  )
} 