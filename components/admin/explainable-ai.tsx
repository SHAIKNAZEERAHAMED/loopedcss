"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { moderateContent, explainModerationDecision, type ModerationResult } from "@/lib/ml/content-moderation-service"
import { Loader2, AlertTriangle, CheckCircle, Info } from "lucide-react"

export function ExplainableAI() {
  const [content, setContent] = useState("")
  const [contentType, setContentType] = useState<"text" | "image" | "video" | "audio">("text")
  const [result, setResult] = useState<ModerationResult | null>(null)
  const [explanation, setExplanation] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const handleModerate = async () => {
    if (!content.trim()) return

    try {
      setLoading(true)
      // Use a placeholder user ID for testing
      const moderationResult = await moderateContent(content, contentType, "test-user-123")
      setResult(moderationResult)

      // Get explanation
      const detailedExplanation = await explainModerationDecision(content, moderationResult)
      setExplanation(detailedExplanation)
    } catch (error) {
      console.error("Error moderating content:", error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "allow":
        return "text-green-600"
      case "warn":
        return "text-yellow-600"
      case "suspend":
        return "text-orange-600"
      case "ban":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "allow":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "warn":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "suspend":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      case "ban":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Explainable AI Moderation</CardTitle>
        <CardDescription>Test content moderation with detailed AI explanations</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" className="mb-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text" onClick={() => setContentType("text")}>
              Text
            </TabsTrigger>
            <TabsTrigger value="image" onClick={() => setContentType("image")}>
              Image
            </TabsTrigger>
            <TabsTrigger value="video" onClick={() => setContentType("video")}>
              Video
            </TabsTrigger>
            <TabsTrigger value="audio" onClick={() => setContentType("audio")}>
              Audio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-4">
            <Textarea
              placeholder="Enter text content to moderate..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </TabsContent>

          <TabsContent value="image" className="mt-4">
            <Textarea
              placeholder="Enter image description or URL to moderate..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </TabsContent>

          <TabsContent value="video" className="mt-4">
            <Textarea
              placeholder="Enter video description or URL to moderate..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </TabsContent>

          <TabsContent value="audio" className="mt-4">
            <Textarea
              placeholder="Enter audio transcription or URL to moderate..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </TabsContent>
        </Tabs>

        <Button onClick={handleModerate} disabled={loading || !content.trim()} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Moderate Content"
          )}
        </Button>

        {result && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">Decision:</span>
                <span className={`font-bold ${result.isViolation ? "text-red-600" : "text-green-600"}`}>
                  {result.isViolation ? "Violation Detected" : "No Violation"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Confidence:</span>
                <span className="font-bold">{Math.round(result.confidence * 100)}%</span>
              </div>
            </div>

            {result.isViolation && (
              <>
                <div>
                  <span className="font-medium">Categories:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {result.categories.map((category) => (
                      <span
                        key={category}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          category === "clean" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">Recommended Action:</span>
                  <span className={`font-bold flex items-center gap-1 ${getActionColor(result.recommendedAction)}`}>
                    {getActionIcon(result.recommendedAction)}
                    {result.recommendedAction.charAt(0).toUpperCase() + result.recommendedAction.slice(1)}
                  </span>
                </div>
              </>
            )}

            <div>
              <span className="font-medium">AI Explanation:</span>
              <div className="mt-2 p-4 bg-muted rounded-md">{explanation}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

