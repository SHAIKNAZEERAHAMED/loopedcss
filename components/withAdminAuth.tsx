'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebase } from '@/contexts/firebase-context'

export function withAdminAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function WithAdminAuthWrapper(props: P) {
    const { user, loading, error } = useFirebase()
    const router = useRouter()

    useEffect(() => {
      if (!loading) {
        if (error) {
          console.error('Authentication error:', error)
          router.push('/login')
          return
        }

        if (!user) {
          console.log('No user found, redirecting to login')
          router.push('/login')
          return
        }

        // Here you can add additional admin checks if needed
        // For example, checking a custom claim or admin flag in your database
      }
    }, [user, loading, error, router])

    if (loading) {
      return <div>Loading...</div>
    }

    if (error || !user) {
      return null // Component will unmount during redirect
    }

    return <WrappedComponent {...props} />
  }
} 