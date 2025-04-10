"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useFirebase } from "@/contexts/firebase-context"

export function withAdminAuth(WrappedComponent: React.ComponentType) {
  return function WithAdminAuthComponent(props: any) {
    const { user, loading } = useFirebase()
    const router = useRouter()
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push("/login")
        } else {
          // Check if user is admin
          const checkAdmin = async () => {
            try {
              const idTokenResult = await user.getIdTokenResult()
              if (idTokenResult.claims.admin) {
                setIsAdmin(true)
              } else {
                router.push("/")
              }
            } catch (error) {
              console.error("Error checking admin status:", error)
              router.push("/")
            }
          }
          checkAdmin()
        }
      }
    }, [user, loading, router])

    if (loading) {
      return <div>Loading...</div>
    }

    if (!user || !isAdmin) {
      return null
    }

    return <WrappedComponent {...props} />
  }
} 