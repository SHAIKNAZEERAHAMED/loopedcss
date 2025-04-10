"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, createUserWithEmailAndPassword, updateProfile, type User } from "firebase/auth"
import { auth } from "@/lib/firebase/config"
import { getUser, createUser, updateUser } from "@/lib/user-service"
import { initializeSocket, closeSocket } from "@/lib/socket-service"

interface AuthContextType {
  user: User | null
  profile: any | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string, displayName: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  signUp: async () => { throw new Error("AuthContext not initialized") },
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const signUp = async (email: string, password: string, displayName: string): Promise<void> => {
    try {
      // Create the user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update the user's display name
      await updateProfile(user, { displayName })

      // Create user profile in the database
      await createUser({
        ...user,
        displayName, // Use the provided display name
      })
    } catch (error: any) {
      console.error("Sign up error:", error)
      throw error
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true)
        setError(null)
        setUser(user)

        if (user) {
          // Get or create user profile
          let userProfile = await getUser(user.uid)

          if (!userProfile) {
            // Create new profile if it doesn't exist
            await createUser(user)
            // Get the newly created profile
            userProfile = await getUser(user.uid)
          }

          if (!userProfile) {
            throw new Error("Failed to create or fetch user profile")
          }

          // Update last login time
          await updateUser(user.uid, { lastActive: Date.now() })
          setProfile(userProfile)

          // Initialize socket connection
          initializeSocket(user.uid)
        } else {
          setProfile(null)
          // Close socket connection on logout
          closeSocket()
        }
      } catch (error: any) {
        console.error("Auth state change error:", error)
        setError(error.message || "An error occurred during authentication")
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signUp }}>
      {children}
    </AuthContext.Provider>
  )
}

