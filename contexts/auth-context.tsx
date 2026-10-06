"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User, onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase/config"
import { getUser, createUser, updateUser, type User as Profile } from "@/lib/user-service"
import { useToast } from "@/components/ui/use-toast"

interface AuthContextType {
  user: User | null
  userProfile: Profile | null
  profile: Profile | null
  loading: boolean
  error: Error | null
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signOut: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, userProfile: null, profile: null, loading: true, error: null,
  signIn: async () => {}, signInWithGoogle: async () => {}, signUp: async () => {}, signOut: async () => {}, logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const syncProfile = async (firebaseUser: User) => {
    let profile = await getUser(firebaseUser.uid)
    if (!profile) {
      await createUser(firebaseUser)
      profile = await getUser(firebaseUser.uid)
    }
    setUserProfile(profile)
    await updateUser(firebaseUser.uid, { lastActive: Date.now() })
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      try {
        setLoading(true); setError(null); setUser(nextUser)
        if (nextUser) {
          document.cookie = `auth-token=${await nextUser.getIdToken()}; path=/; SameSite=Lax`
          await syncProfile(nextUser)
        } else {
          setUserProfile(null)
          document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error("Authentication failed")
        setError(err)
      } finally { setLoading(false) }
    })
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider())
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(result.user, { displayName })
    await createUser({ ...result.user, displayName })
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      setUserProfile(null)
      toast({ title: "Signed out", description: "You have been signed out successfully." })
      router.push("/login")
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to sign out."
      toast({ title: "Error", description: message, variant: "destructive" })
    }
  }

  return <AuthContext.Provider value={{ user, userProfile, profile: userProfile, loading, error, signIn, signInWithGoogle, signUp, signOut, logout: signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
