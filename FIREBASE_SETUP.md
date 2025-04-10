# Firebase Setup Instructions

This document provides instructions on how to set up Firebase for your application.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps to create a new project
3. Give your project a name and follow the setup wizard

## 2. Enable Authentication

1. In the Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Enable the authentication methods you want to use (Email/Password, Google, etc.)

## 3. Enable Realtime Database

1. In the Firebase Console, go to "Realtime Database" in the left sidebar
2. Click "Create database"
3. Choose a location for your database
4. Start in test mode (you can update security rules later)
5. Click "Enable"

## 4. Get Your Firebase Configuration

1. In the Firebase Console, click on the gear icon (⚙️) next to "Project Overview" to open Project settings
2. Scroll down to the "Your apps" section
3. Click on the web icon (</>)
4. Register your app with a nickname
5. Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com"
};
```

## 5. Update Your Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist already)
2. Add the following environment variables with your Firebase configuration values:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

## 6. Verify Your Configuration

Run the verification script to check if your Firebase configuration is correct:

```bash
node scripts/verify-firebase.js
```

## 7. Update Security Rules

1. In the Firebase Console, go to "Realtime Database" in the left sidebar
2. Click on the "Rules" tab
3. Update the security rules to match your application's requirements
4. Click "Publish"

## 8. Restart Your Development Server

After updating your environment variables, restart your Next.js development server:

```bash
npm run dev
```

## Troubleshooting

If you encounter the "auth/invalid-api-key" error:

1. Make sure your API key is correct in the `.env.local` file
2. Check that the `.env.local` file is in the root directory of your project
3. Restart your development server after updating the environment variables
4. Check the browser console for any other Firebase-related errors

For more help, visit the [Firebase documentation](https://firebase.google.com/docs) or the [Next.js documentation](https://nextjs.org/docs). 