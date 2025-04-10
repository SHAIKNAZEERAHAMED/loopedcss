import { openai } from "@ai-sdk/openai"

export interface GenerateTextOptions {
  model: string
  system: string
  prompt: string
  temperature?: number
  max_tokens?: number
}

export interface GenerateTextResult {
  text: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
  try {
    const { model, system, prompt, temperature = 0.7, max_tokens = 100 } = options

    const response = await openai.createCompletion({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      temperature,
      max_tokens,
    })

    return {
      text: response.choices[0]?.message?.content || "",
      usage: response.usage,
    }
  } catch (error) {
    console.error("Error generating text:", error)
    throw error
  }
} 