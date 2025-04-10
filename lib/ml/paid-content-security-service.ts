import { generateText } from "@/lib/ai"
import { openai } from "@ai-sdk/openai"

// Types for paid content security
export type SecurityViolationType = "screenshot" | "screen_recording" | "explicit_content" | "none"
export type SecurityAction = "block" | "warn" | "allow"

export type SecurityCheckResult = {
  isViolation: boolean
  violationType: SecurityViolationType
  confidence: number
  recommendedAction: SecurityAction
  explanation: string
}

/**
 * Checks content for security violations before allowing it in paid loops
 * @param content The content to check
 * @param contentType The type of content ('text', 'image', 'video', 'audio')
 * @returns A SecurityCheckResult object with detailed security information
 */
export async function checkPaidContentSecurity(content: string, contentType: string): Promise<SecurityCheckResult> {
  try {
    // Use content-type specific prompt
    let promptBase = "You are an expert in content security for premium paid content. "

    switch (contentType) {
      case "text":
        promptBase += "Analyze this text for security violations in a paid content context:"
        break
      case "image":
        promptBase += "Analyze this image description for security violations in a paid content context:"
        break
      case "video":
        promptBase += "Analyze this video description for security violations in a paid content context:"
        break
      case "audio":
        promptBase += "Analyze this audio transcription for security violations in a paid content context:"
        break
    }

    const prompt = `${promptBase}
    
"${content}"

Check specifically for:
1. Indications of screenshots or screen recordings
2. Explicit content that violates platform policies
3. Content that suggests redistribution of paid content

Provide a JSON response with these fields:
- isViolation: Boolean indicating if this violates security policies
- violationType: One of 'screenshot', 'screen_recording', 'explicit_content', or 'none'
- confidence: Your confidence in this analysis (0-1)
- recommendedAction: One of 'block', 'warn', or 'allow'
- explanation: Brief explanation of your decision

Format your response as valid JSON only.`

    // Use AI SDK to get security analysis
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
      temperature: 0.1,
      maxTokens: 500,
    })

    // Parse the response
    const result = JSON.parse(text)

    return {
      isViolation: result.isViolation,
      violationType: result.violationType,
      confidence: result.confidence,
      recommendedAction: result.recommendedAction,
      explanation: result.explanation,
    }
  } catch (error) {
    console.error("Error checking paid content security:", error)
    // Fallback to safe result
    return {
      isViolation: false,
      violationType: "none",
      confidence: 0.5,
      recommendedAction: "allow",
      explanation: "Error analyzing content. Defaulting to safe classification.",
    }
  }
}

/**
 * Detects screenshot or screen recording attempts in image data
 * This would typically use computer vision models like YOLO or CLIP
 * @param imageData Base64 encoded image data
 * @returns Whether a screenshot/recording was detected and confidence level
 */
export async function detectScreenCapture(imageData: string): Promise<{ detected: boolean; confidence: number }> {
  try {
    // In a real implementation, this would use a vision model API
    // For this example, we'll simulate the detection

    // Simulate detection with 90% accuracy
    const randomValue = Math.random()
    const detected = randomValue > 0.1 // 90% detection rate
    const confidence = 0.7 + randomValue * 0.3 // Confidence between 0.7 and 1.0

    return { detected, confidence }
  } catch (error) {
    console.error("Error detecting screen capture:", error)
    return { detected: false, confidence: 0.5 }
  }
}

/**
 * Calculates the accuracy of security violation detection
 * @param predictions Array of predicted results (isViolation boolean)
 * @param groundTruth Array of actual results (isViolation boolean)
 * @returns Accuracy as a percentage
 */
export function calculateSecurityAccuracy(predictions: boolean[], groundTruth: boolean[]): number {
  if (predictions.length !== groundTruth.length || predictions.length === 0) {
    return 0
  }

  let correct = 0
  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] === groundTruth[i]) {
      correct++
    }
  }

  return (correct / predictions.length) * 100
}

