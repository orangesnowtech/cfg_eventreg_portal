import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Initialize Firebase Admin SDK
 * Used for server-side operations (API routes)
 */
function initAdmin() {
  // Skip initialization during build time
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production' && !process.env.FIREBASE_PROJECT_ID) {
    return;
  }

  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.warn('Firebase Admin credentials not found. Skipping initialization.');
      return;
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
}

initAdmin();

export const adminDb = getFirestore();
export const adminAuth = getAuth();
