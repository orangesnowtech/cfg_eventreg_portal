import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Initialize Firebase Admin SDK
 * Used for server-side operations (API routes)
 */
function initAdmin() {
  // Skip initialization during build time (secrets not available during build)
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.log('Firebase Admin: credentials not available, skipping initialization (build time)');
    return;
  }

  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Firebase Admin credentials incomplete:', {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
      });
      return;
    }

    console.log('Initializing Firebase Admin SDK...');
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('Firebase Admin SDK initialized successfully');
  }
}

// Lazy initialization - only init when actually accessed
let initialized = false;

function ensureInitialized() {
  if (!initialized) {
    initAdmin();
    initialized = true;
  }
}

// Export lazy getters that ensure initialization
export const getAdminDb = () => {
  ensureInitialized();
  const apps = getApps();
  if (apps.length === 0) {
    console.error('Firebase Admin SDK failed to initialize. Environment check:', {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'present' : 'missing',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'present' : 'missing',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'present' : 'missing',
      NODE_ENV: process.env.NODE_ENV,
    });
    throw new Error('Firebase Admin SDK failed to initialize. Secrets may not be loaded from Secret Manager.');
  }
  return getFirestore();
};

export const getAdminAuth = () => {
  ensureInitialized();
  const apps = getApps();
  if (apps.length === 0) {
    console.error('Firebase Admin SDK failed to initialize. Environment check:', {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'present' : 'missing',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'present' : 'missing',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'present' : 'missing',
      NODE_ENV: process.env.NODE_ENV,
    });
    throw new Error('Firebase Admin SDK failed to initialize. Secrets may not be loaded from Secret Manager.');
  }
  return getAuth();
};

// For backward compatibility, export as properties
export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(target, prop) {
    return getAdminDb()[prop as keyof ReturnType<typeof getFirestore>];
  }
});

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(target, prop) {
    return getAdminAuth()[prop as keyof ReturnType<typeof getAuth>];
  }
});
