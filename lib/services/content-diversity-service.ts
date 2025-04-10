import type { Post } from "@/types/post"
import type { UserPreferences } from "@/types/user"

// Content categories for classification
export enum ContentCategory {
  Entertainment = "entertainment",
  News = "news",
  Sports = "sports",
  Technology = "technology",
  Education = "education",
  Lifestyle = "lifestyle",
  Art = "art",
  Music = "music",
  Food = "food",
  Travel = "travel",
  Fashion = "fashion",
  Health = "health",
  Science = "science",
  Politics = "politics",
  Business = "business",
  Other = "other",
}

// Content diversity settings
export interface DiversitySettings {
  preferredCategories: ContentCategory[]
  diversityLevel: "low" | "medium" | "high"
  followingWeight: number // 0-1, how much to prioritize following
  newAccountsExposure: number // 0-1, how much to expose new accounts
  localContentWeight: number // 0-1, how much to prioritize local content
  languagePreference: "telugu" | "english" | "both"
}

// Default diversity settings
export const defaultDiversitySettings: DiversitySettings = {
  preferredCategories: [],
  diversityLevel: "medium",
  followingWeight: 0.6,
  newAccountsExposure: 0.3,
  localContentWeight: 0.5,
  languagePreference: "both",
}

// Content diversity service
export class ContentDiversityService {
  // Classify content into categories based on text, hashtags, and metadata
  static classifyContent(post: Post): ContentCategory[] {
    // In a real implementation, this would use ML to classify content
    // For now, we'll use a simple keyword-based approach
    const categories: ContentCategory[] = []
    const text = post.text?.toLowerCase() || ""
    const hashtags = post.hashtags || []

    // Simple keyword matching for demonstration
    if (text.includes("movie") || text.includes("film") || hashtags.includes("entertainment")) {
      categories.push(ContentCategory.Entertainment)
    }

    if (text.includes("news") || text.includes("breaking") || hashtags.includes("news")) {
      categories.push(ContentCategory.News)
    }

    // Add more classification logic for other categories

    // If no categories matched, mark as Other
    if (categories.length === 0) {
      categories.push(ContentCategory.Other)
    }

    return categories
  }

  // Calculate diversity score for a set of posts
  static calculateDiversityScore(posts: Post[]): number {
    if (posts.length === 0) return 0

    // Count occurrences of each category
    const categoryCounts = new Map<ContentCategory, number>()

    posts.forEach((post) => {
      const categories = this.classifyContent(post)
      categories.forEach((category) => {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
      })
    })

    // Calculate entropy as a measure of diversity
    let entropy = 0
    const totalCategories = Array.from(categoryCounts.values()).reduce((a, b) => a + b, 0)

    categoryCounts.forEach((count) => {
      const probability = count / totalCategories
      entropy -= probability * Math.log2(probability)
    })

    // Normalize to 0-1 range (1 being most diverse)
    const maxEntropy = Math.log2(Object.keys(ContentCategory).length / 2) // Maximum possible entropy
    return entropy / maxEntropy
  }

  // Mix content based on user preferences and diversity settings
  static mixContent(
    allPosts: Post[],
    userPreferences: UserPreferences,
    diversitySettings: DiversitySettings = defaultDiversitySettings,
  ): Post[] {
    // Clone posts to avoid modifying the original array
    const posts = [...allPosts]

    // Step 1: Score each post based on user preferences and diversity settings
    const scoredPosts = posts.map((post) => {
      let score = 0

      // Score based on preferred categories
      const postCategories = this.classifyContent(post)
      const preferredCategoryMatch = postCategories.some((category) =>
        diversitySettings.preferredCategories.includes(category),
      )

      if (preferredCategoryMatch) {
        score += 0.3
      }

      // Score based on following
      if (userPreferences.following.includes(post.authorId)) {
        score += diversitySettings.followingWeight
      }

      // Score based on language preference
      if (diversitySettings.languagePreference !== "both") {
        const postLanguage = post.language || "english"
        if (postLanguage === diversitySettings.languagePreference) {
          score += 0.2
        }
      }

      // Score based on local content
      if (post.location && userPreferences.location) {
        if (post.location === userPreferences.location) {
          score += diversitySettings.localContentWeight * 0.2
        }
      }

      // Add randomness factor to prevent echo chambers
      const randomFactor = Math.random() * 0.2
      score += randomFactor

      return { post, score }
    })

    // Step 2: Sort posts by score
    scoredPosts.sort((a, b) => b.score - a.score)

    // Step 3: Apply diversity level adjustments
    let finalPosts: Post[] = []

    switch (diversitySettings.diversityLevel) {
      case "low":
        // 80% preferred, 20% diverse
        finalPosts = this.applyDiversityMix(scoredPosts, 0.8)
        break
      case "medium":
        // 60% preferred, 40% diverse
        finalPosts = this.applyDiversityMix(scoredPosts, 0.6)
        break
      case "high":
        // 40% preferred, 60% diverse
        finalPosts = this.applyDiversityMix(scoredPosts, 0.4)
        break
      default:
        finalPosts = this.applyDiversityMix(scoredPosts, 0.6)
    }

    return finalPosts
  }

  // Helper method to mix preferred and diverse content
  private static applyDiversityMix(scoredPosts: { post: Post; score: number }[], preferredRatio: number): Post[] {
    const totalPosts = scoredPosts.length
    const preferredCount = Math.floor(totalPosts * preferredRatio)
    const diverseCount = totalPosts - preferredCount

    // Get top scoring posts for preferred content
    const preferredPosts = scoredPosts.slice(0, preferredCount).map((item) => item.post)

    // Get diverse posts (lower scoring but with category diversity)
    const remainingPosts = scoredPosts.slice(preferredCount)

    // Ensure category diversity in the remaining posts
    const diversePosts: Post[] = []
    const selectedCategories = new Set<ContentCategory>()

    // First pass: try to get posts from unique categories
    for (const { post } of remainingPosts) {
      if (diversePosts.length >= diverseCount) break

      const categories = this.classifyContent(post)
      const hasNewCategory = categories.some((category) => !selectedCategories.has(category))

      if (hasNewCategory) {
        diversePosts.push(post)
        categories.forEach((category) => selectedCategories.add(category))
      }
    }

    // Second pass: fill remaining slots if needed
    if (diversePosts.length < diverseCount) {
      const neededCount = diverseCount - diversePosts.length
      const remainingPostsNotSelected = remainingPosts
        .filter(({ post }) => !diversePosts.includes(post))
        .slice(0, neededCount)
        .map((item) => item.post)

      diversePosts.push(...remainingPostsNotSelected)
    }

    // Interleave preferred and diverse posts for a balanced feed
    const finalPosts: Post[] = []
    const maxLength = Math.max(preferredPosts.length, diversePosts.length)

    for (let i = 0; i < maxLength; i++) {
      if (i < preferredPosts.length) {
        finalPosts.push(preferredPosts[i])
      }

      if (i < diversePosts.length) {
        finalPosts.push(diversePosts[i])
      }
    }

    return finalPosts
  }
}

