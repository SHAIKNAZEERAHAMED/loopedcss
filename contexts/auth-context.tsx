"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { useFirebase } from './firebase-context'
import { auth } from '@/lib/firebase/config'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  userProfile: any | null
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  userProfile: null,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: firebaseLoading, error: firebaseError } = useFirebase()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)

  useEffect(() => {
    setLoading(firebaseLoading)
    setError(firebaseError)
  }, [firebaseLoading, firebaseError])

  const logout = async () => {
    try {
      if (auth) {
        await auth.signOut()
      }
    } catch (error) {
      console.error('Logout error:', error)
      setError(error as Error)
    }
  }

  const value = {
    user,
    loading,
    error,
    userProfile,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

