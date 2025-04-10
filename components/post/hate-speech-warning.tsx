"use client"

import { useState } from "react"
import { AlertTriangle, Shield, ThumbsDown, ThumbsUp } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { type HateSpeechResult, addHateSpeechFeedback } from "@/lib/ml/hate-speech-detection-service"

interface HateSpeechWarningProps {
  result: HateSpeechResult
  content: string
  onDismiss: () => void
  onReveal: () => void
}

export function HateSpeechWarning({ result, content, onDismiss, onReveal }: HateSpeechWarningProps) {
  const [feedbackGiven, setFeedbackGiven] = useState(false)

  // Get severity color
  const severityColor = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    low: "bg-yellow-100 text-yellow-800 border-yellow-200",
    none: "bg-gray-100 text-gray-800 border-gray-200",
  }[result.severity]

  // Handle feedback
  const handleFeedback = (agreed: boolean) => {
    addHateSpeechFeedback(content, result, agreed)
    setFeedbackGiven(true)
  }

  return (
    <Alert className={`${severityColor} mb-4`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Content Warning
        {result.feedbackIncorporated && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            <Shield className="mr-1 h-3 w-3" />
            AI-improved
          </span>
        )}
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <p>{result.explanation}</p>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onReveal} className="bg-white/50">
              Show Content
            </Button>

            <Button variant="outline" size="sm" onClick={onDismiss} className="bg-white/50">
              Hide Content
            </Button>

            {!feedbackGiven && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs">Was this warning helpful?</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-white/50"
                  onClick={() => handleFeedback(true)}
                >
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-white/50"
                  onClick={() => handleFeedback(false)}
                >
                  <ThumbsDown className="h-3 w-3" />
                </Button>
              </div>
            )}

            {feedbackGiven && (
              <div className="ml-auto">
                <span className="text-xs">Thank you for your feedback!</span>
              </div>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

