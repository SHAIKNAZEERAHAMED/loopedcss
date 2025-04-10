import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getDatabase, ref, update, Database } from "firebase/database"
import { getStorage, FirebaseStorage } from "firebase/storage"

// Initialize Firebase variables
let firebaseApp: FirebaseApp | undefined
let auth: Auth | undefined
let db: Database | undefined
let storage: FirebaseStorage | undefined

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL'
] as const

// Debug: Log all environment variables
console.log('Environment Variables:')
requiredEnvVars.forEach(envVar => {
  console.log(`${envVar}: ${process.env[envVar] ? '✓ Set' : '✗ Missing'}`)
})

const missingEnvVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar]
)

if (missingEnvVars.length > 0) {
  console.error('Missing environment variables:', missingEnvVars)
  if (process.env.NODE_ENV === 'development') {
    console.warn('Running in development mode - continuing without environment variables')
  } else {
    console.error('Missing required environment variables:', missingEnvVars.join(', '))
    // Don't throw an error in production, just log it
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

// Debug: Log Firebase config (without sensitive values)
console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
  appId: firebaseConfig.appId ? '✓ Set' : '✗ Missing',
})

export function initializeFirebase() {
  if (typeof window === 'undefined') {
    console.log('Skipping Firebase initialization on server side')
    return null
  }

  try {
    if (!getApps().length) {
      console.log('Initializing new Firebase app')
      firebaseApp = initializeApp(firebaseConfig)
    } else {
      console.log('Using existing Firebase app')
      firebaseApp = getApp()
    }

    auth = getAuth(firebaseApp)
    db = getDatabase(firebaseApp)
    storage = getStorage(firebaseApp)

    return firebaseApp
  } catch (error) {
    console.error("Error initializing Firebase:", error)
    return null
  }
}

// Initialize Firebase on the client side
if (typeof window !== 'undefined') {
  console.log('Running on client side, initializing Firebase')
  initializeFirebase()
} else {
  console.log('Running on server side, skipping Firebase initialization')
}

// Ensure search fields exist in the database
async function ensureSearchFields() {
  if (!db) return
  
  try {
    // Initialize users search fields
    const usersRef = ref(db, "users")
    await update(usersRef, {
      searchName: "",
    })
  } catch (error) {
    console.error("Error initializing search fields:", error)
  }
}

export { firebaseApp, auth, db, storage }

