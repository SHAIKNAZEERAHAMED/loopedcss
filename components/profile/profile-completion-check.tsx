"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth/auth-provider"
import { getUser } from "@/lib/user-service"
import { ProfileSetup } from "@/components/profile/profile-setup"
import { Loader2 } from "lucide-react"

interface ProfileCompletionCheckProps {
  children: React.ReactNode
}

export function ProfileCompletionCheck({ children }: ProfileCompletionCheckProps) {
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!user) return

      try {
        const userData = await getUser(user.uid)
        if (userData) {
          setIsProfileComplete(userData.isProfileComplete || false)
        }
      } catch (error) {
        console.error("Error checking profile completion:", error)
      }
    }

    checkProfileCompletion()
  }, [user])

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isProfileComplete === null) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isProfileComplete) {
    return (
      <div className="container mx-auto py-8 px-4">
        <ProfileSetup />
      </div>
    )
  }

  return <>{children}</>
}

