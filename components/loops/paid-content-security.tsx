"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Shield, AlertTriangle, Lock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { checkPaidContentSecurity, type SecurityCheckResult } from "@/lib/ml/paid-content-security-service"

interface PaidContentSecurityProps {
  content: string
  contentType: string
  children: React.ReactNode
}

export function PaidContentSecurity({ content, contentType, children }: PaidContentSecurityProps) {
  const [securityResult, setSecurityResult] = useState<SecurityCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [showContent, setShowContent] = useState(true)

  useEffect(() => {
    async function checkSecurity() {
      try {
        setLoading(true)
        const result = await checkPaidContentSecurity(content, contentType)
        setSecurityResult(result)

        // Hide content if it's a violation with block action
        if (result.isViolation && result.recommendedAction === "block") {
          setShowContent(false)
        }
      } catch (error) {
        console.error("Error checking content security:", error)
      } finally {
        setLoading(false)
      }
    }

    checkSecurity()
  }, [content, contentType])

  if (loading) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Secure Content
          </CardTitle>
          <CardDescription>Checking content security...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!securityResult) {
    return <>{children}</>
  }

  if (securityResult.isViolation && !showContent) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Content Blocked</AlertTitle>
        <AlertDescription>{securityResult.explanation}</AlertDescription>
      </Alert>
    )
  }

  if (securityResult.isViolation && securityResult.recommendedAction === "warn") {
    return (
      <>
        <Alert className="mb-4 bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Warning</AlertTitle>
          <AlertDescription>{securityResult.explanation}</AlertDescription>
        </Alert>
        {children}
      </>
    )
  }

  return (
    <>
      <div className="relative">
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Secured
          </div>
        </div>
        {children}
      </div>
    </>
  )
}

