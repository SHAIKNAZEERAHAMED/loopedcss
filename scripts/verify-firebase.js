// This script helps verify your Firebase configuration
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Parse environment variables
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        envVars[key.trim()] = value.trim();
      }
    }
  });
}

// Check required Firebase environment variables
const requiredVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_DATABASE_URL'
];

console.log('Firebase Configuration Verification:');
console.log('==================================');

let allValid = true;

requiredVars.forEach(varName => {
  const value = envVars[varName];
  const isValid = value && value !== 'your-project-id' && !value.includes('XXXX');
  
  console.log(`${varName}: ${isValid ? '✅ Valid' : '❌ Invalid or placeholder'}`);
  
  if (!isValid) {
    allValid = false;
  }
});

if (allValid) {
  console.log('\n✅ All Firebase environment variables are properly configured!');
} else {
  console.log('\n❌ Some Firebase environment variables are missing or contain placeholder values.');
  console.log('Please update your .env.local file with your actual Firebase project credentials.');
  console.log('You can find these values in your Firebase project settings.');
}

// Check API key format
const apiKey = envVars['NEXT_PUBLIC_FIREBASE_API_KEY'];
if (apiKey && !apiKey.startsWith('AIzaSy')) {
  console.log('\n⚠️ Warning: Your Firebase API key does not match the expected format.');
  console.log('Firebase API keys typically start with "AIzaSy".');
} 