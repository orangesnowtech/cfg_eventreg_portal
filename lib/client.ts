import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase Client Configuration
 * Used for client-side operations (browser)
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug configuration in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Firebase config check:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
  });
}

// Check if we have valid config (skip during build if env vars are missing)
const hasValidConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase only if we have valid config
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (hasValidConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn('Firebase client configuration missing. Skipping initialization.');
}

export { auth, db };
