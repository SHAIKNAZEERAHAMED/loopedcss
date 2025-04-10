// Types for ML model accuracy tracking
export type ModelType = "sentiment" | "hate_speech" | "content_moderation" | "security"
export type ContentType = "text" | "image" | "video" | "audio"
export type Language = "english" | "telugu" | "telugu-english" | "other"

export type AccuracyMetrics = {
  contentModeration: {
    overall: number
    byLanguage: Record<string, number>
    byContentType: Record<string, number>
    byCategory: Record<string, number>
  }
  hateSpeech: {
    overall: number
    byLanguage: Record<string, number>
  }
  sentiment: {
    overall: number
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  security: {
    overall: number
    byViolationType: Record<string, number>
  }
  recommendation: {
    overall: number
    relevanceScore: number
    userSatisfaction: number
  }
}

// In-memory storage for accuracy metrics (in production, this would be in a database)
const accuracyMetrics: AccuracyMetrics = {
  contentModeration: {
    overall: 92.5,
    byLanguage: {
      english: 94.2,
      telugu: 91.8,
      "telugu-english": 90.5,
      other: 88.7,
    },
    byContentType: {
      text: 93.8,
      image: 91.2,
      video: 90.5,
      audio: 89.7,
    },
    byCategory: {
      hate: 94.5,
      harassment: 92.8,
      sexual: 95.2,
      violence: 93.7,
      "self-harm": 91.5,
      misinformation: 89.8,
      spam: 96.3,
      clean: 97.2,
    },
  },
  hateSpeech: {
    overall: 93.2,
    byLanguage: {
      english: 94.7,
      telugu: 92.3,
      "telugu-english": 91.8,
      other: 89.5,
    },
  },
  sentiment: {
    overall: 91.8,
    positive: 93.5,
    negative: 92.7,
    neutral: 90.8,
    mixed: 88.5,
  },
  security: {
    overall: 94.3,
    byViolationType: {
      screenshot: 95.2,
      screen_recording: 93.8,
      explicit_content: 96.1,
      none: 97.5,
    },
  },
  recommendation: {
    overall: 90.2,
    relevanceScore: 88.7,
    userSatisfaction: 92.5,
  },
}

/**
 * Gets the current accuracy metrics for all ML models
 * @returns The current accuracy metrics
 */
export function getMLModelAccuracy(): AccuracyMetrics {
  return accuracyMetrics
}

/**
 * Updates the accuracy metrics for a specific model
 * @param modelType The type of model
 * @param accuracy The new accuracy value
 * @param subCategory Optional subcategory (e.g., language, content type)
 * @param subCategoryValue Optional subcategory value
 */
export function updateModelAccuracy(
  modelType: ModelType,
  accuracy: number,
  subCategory?: string,
  subCategoryValue?: string,
): void {
  switch (modelType) {
    case "sentiment":
      if (subCategory === "overall") {
        accuracyMetrics.sentiment.overall = accuracy
      } else if (subCategoryValue && ["positive", "negative", "neutral", "mixed"].includes(subCategoryValue)) {
        accuracyMetrics.sentiment[subCategoryValue as keyof typeof accuracyMetrics.sentiment] = accuracy
      }
      break

    case "hate_speech":
      if (subCategory === "overall") {
        accuracyMetrics.hateSpeech.overall = accuracy
      } else if (subCategory === "language" && subCategoryValue) {
        accuracyMetrics.hateSpeech.byLanguage[subCategoryValue] = accuracy
      }
      break

    case "content_moderation":
      if (subCategory === "overall") {
        accuracyMetrics.contentModeration.overall = accuracy
      } else if (subCategory === "language" && subCategoryValue) {
        accuracyMetrics.contentModeration.byLanguage[subCategoryValue] = accuracy
      } else if (subCategory === "contentType" && subCategoryValue) {
        accuracyMetrics.contentModeration.byContentType[subCategoryValue] = accuracy
      } else if (subCategory === "category" && subCategoryValue) {
        accuracyMetrics.contentModeration.byCategory[subCategoryValue] = accuracy
      }
      break

    case "security":
      if (subCategory === "overall") {
        accuracyMetrics.security.overall = accuracy
      } else if (subCategory === "violationType" && subCategoryValue) {
        accuracyMetrics.security.byViolationType[subCategoryValue] = accuracy
      }
      break
  }
}

/**
 * Simulates a model evaluation run and updates accuracy metrics
 * In a real implementation, this would run actual evaluations against test datasets
 */
export function runModelEvaluation(): void {
  // Simulate accuracy improvements over time
  const smallImprovement = Math.random() * 0.5

  // Update sentiment analysis accuracy
  updateModelAccuracy("sentiment", Math.min(95, accuracyMetrics.sentiment.overall + smallImprovement), "overall")

  // Update hate speech detection accuracy
  updateModelAccuracy("hate_speech", Math.min(95, accuracyMetrics.hateSpeech.overall + smallImprovement), "overall")

  // Update content moderation accuracy
  updateModelAccuracy(
    "content_moderation",
    Math.min(95, accuracyMetrics.contentModeration.overall + smallImprovement),
    "overall",
  )

  // Update security detection accuracy
  updateModelAccuracy("security", Math.min(97, accuracyMetrics.security.overall + smallImprovement), "overall")

  console.log("Model evaluation completed. Updated accuracy metrics.")
}

