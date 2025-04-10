"use client"

import { useState, useEffect } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { SentimentResult } from "@/lib/ml/sentiment-analysis-service"

interface SentimentIndicatorProps {
  sentiment: SentimentResult
  size?: "sm" | "md" | "lg"
  showDetails?: boolean
}

export function SentimentIndicator({ sentiment, size = "md", showDetails = false }: SentimentIndicatorProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // Size classes
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  // Get sentiment details
  const { emoji, colorCode, sentiment: sentimentType, confidence, dominantEmotion } = sentiment

  // Format confidence as percentage
  const confidencePercent = Math.round(confidence * 100)

  // Capitalize sentiment type and emotion
  const capitalizedSentiment = sentimentType.charAt(0).toUpperCase() + sentimentType.slice(1)
  const capitalizedEmotion = dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 ${sizeClasses[size]}`}
            style={{ backgroundColor: `${colorCode}20`, color: colorCode }}
          >
            <span className="text-lg">{emoji}</span>
            {showDetails && <span className="font-medium">{capitalizedSentiment}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {capitalizedSentiment} ({confidencePercent}% confidence)
            </p>
            <p>Dominant emotion: {capitalizedEmotion}</p>
            {sentiment.language !== "english" && (
              <p>Language: {sentiment.language.charAt(0).toUpperCase() + sentiment.language.slice(1)}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

