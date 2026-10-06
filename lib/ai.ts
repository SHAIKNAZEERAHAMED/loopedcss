import { generateText as generateTextWithModel } from "ai"
import { openai } from "@ai-sdk/openai"

export interface GenerateTextOptions {
  model: Parameters<typeof generateTextWithModel>[0]["model"] | string
  system?: string
  prompt: string
  temperature?: number
  max_tokens?: number
  maxTokens?: number
}

export interface GenerateTextResult {
  text: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export async function generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
  const {
    model,
    system,
    prompt,
    temperature = 0.7,
    max_tokens,
    maxTokens,
  } = options

  try {
    const result = await generateTextWithModel({
      model: typeof model === "string" ? openai(model) : model,
      system,
      prompt,
      temperature,
      maxTokens: maxTokens ?? max_tokens ?? 100,
    })

    const usage = result.usage as {
      inputTokens?: number
      outputTokens?: number
      totalTokens?: number
      promptTokens?: number
      completionTokens?: number
    } | undefined

    return {
      text: result.text,
      usage: usage
        ? {
            prompt_tokens: usage.inputTokens ?? usage.promptTokens,
            completion_tokens: usage.outputTokens ?? usage.completionTokens,
            total_tokens: usage.totalTokens,
          }
        : undefined,
    }
  } catch (error) {
    console.error("Error generating text:", error)
    throw error
  }
}
