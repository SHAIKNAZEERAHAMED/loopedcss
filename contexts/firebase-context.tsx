"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import { initializeFirebase } from "@/lib/firebase/config"

interface FirebaseContextType {
  user: User | null
  loading: boolean
  error: Error | null
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  loading: true,
  error: null,
})

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Set isClient to true when component mounts (client-side only)
    setIsClient(true)
    
    // Only run auth state listener on the client side
    if (typeof window === 'undefined') {
      setLoading(false)
      return
    }

    let unsubscribe: (() => void) | undefined

    const setupAuth = async () => {
      try {
        // Initialize Firebase if not already initialized
        const app = initializeFirebase()
        if (!app) {
          setError(new Error('Failed to initialize Firebase'))
          setLoading(false)
          return
        }

        if (!auth) {
          setError(new Error('Auth is not available'))
          setLoading(false)
          return
        }

        unsubscribe = auth.onAuthStateChanged(
          (user) => {
            setUser(user)
            setLoading(false)
          },
          (error) => {
            console.error("Auth state change error:", error)
            setError(error)
            setLoading(false)
          }
        )
      } catch (error) {
        console.error("Firebase initialization error:", error)
        setError(error as Error)
        setLoading(false)
      }
    }

    setupAuth()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  // If we're on the server or still loading, render children without context
  if (!isClient || loading) {
    return <>{children}</>
  }

  const value = {
    user,
    loading,
    error,
  }

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>
}

export const useFirebase = () => useContext(FirebaseContext) 