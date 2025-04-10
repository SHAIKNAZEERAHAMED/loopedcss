// List of supported Indian languages
export const INDIAN_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
]

/**
 * Translates text to the specified Indian language
 * In a real implementation, this would use a translation API
 */
export async function translateText(text: string, targetLanguage: string): Promise<string> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Call a translation API like Google Translate
  // 2. Return the translated text

  // For demo purposes, we'll return a simulated translation
  await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate API delay

  // Return original text for English
  if (targetLanguage === "en") return text

  // For demo purposes, add a prefix to indicate translation
  return `[${getLanguageName(targetLanguage)}] ${text}`
}

/**
 * Gets the language name from the language code
 */
export function getLanguageName(languageCode: string): string {
  const language = INDIAN_LANGUAGES.find((lang) => lang.code === languageCode)
  return language ? language.name : "Unknown"
}

/**
 * Gets the native language name from the language code
 */
export function getNativeLanguageName(languageCode: string): string {
  const language = INDIAN_LANGUAGES.find((lang) => lang.code === languageCode)
  return language ? language.nativeName : "Unknown"
}

/**
 * Detects the language of the given text
 * In a real implementation, this would use a language detection API
 */
export async function detectLanguage(text: string): Promise<string> {
  // This is a placeholder. In a real implementation, you would:
  // 1. Call a language detection API
  // 2. Return the detected language code

  // For demo purposes, we'll always return English
  return "en"
}

