"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  adminOnly?: boolean
}

export function AuthGuard({ children, requireAuth = true, adminOnly = false }: AuthGuardProps) {
  const { user, loading, error } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!loading) {
      if (requireAuth && !user) {
        // Redirect to sign-in for protected routes
        router.replace('/sign-in')
      } else if (adminOnly && (!user || !user.email?.endsWith('@loopcss.com'))) {
        // Redirect non-admin users
        router.replace('/')
      }
    }
  }, [user, loading, requireAuth, adminOnly, router])

  // Don't render anything on the server side
  if (typeof window === 'undefined') {
    return null
  }

  // Show loading state
  if (loading) {
    return <div>Loading...</div>
  }

  // Show error state
  if (error) {
    return <div>Error: {error.message}</div>
  }

  // Don't render protected content for unauthenticated users
  if (requireAuth && !user) {
    return null
  }

  // Don't render admin content for non-admin users
  if (adminOnly && (!user || !user.email?.endsWith('@loopcss.com'))) {
    return null
  }

  return <>{children}</>
} 