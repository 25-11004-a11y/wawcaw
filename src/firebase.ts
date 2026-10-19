import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, Auth, User } from 'firebase/auth';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let currentUser: User | null = null;
let authInitPromise: Promise<User | null> | null = null;

export function isFirebaseConfigured(): boolean {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  return Boolean(apiKey && authDomain && projectId && appId);
}

export function initFirebase(): { db: Firestore | null; auth: Auth | null } {
  if (!isFirebaseConfigured()) {
    return { db: null, auth: null };
  }

  try {
    if (!app) {
      const config: FirebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      const existingApps = getApps();
      app = existingApps.length > 0 ? existingApps[0] : initializeApp(config);

      // Initialize persistent local cache for offline reliability
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
      } catch {
        // Fallback if already initialized
        db = initializeFirestore(app, {});
      }

      auth = getAuth(app);
    }
    return { db, auth };
  } catch (err) {
    console.warn('Firebase initialization skipped or failed:', err);
    return { db: null, auth: null };
  }
}

/**
 * Ensures anonymous authentication silently without showing any login UI.
 */
export async function getAnonymousUser(): Promise<User | null> {
  const { auth: currentAuth } = initFirebase();
  if (!currentAuth) return null;

  if (currentUser) return currentUser;
  if (currentAuth.currentUser) {
    currentUser = currentAuth.currentUser;
    return currentUser;
  }

  if (authInitPromise) {
    return authInitPromise;
  }

  authInitPromise = new Promise((resolve) => {
    try {
      const unsubscribe = onAuthStateChanged(currentAuth, async (user) => {
        unsubscribe();
        if (user) {
          currentUser = user;
          resolve(user);
        } else {
          try {
            const userCred = await signInAnonymously(currentAuth);
            currentUser = userCred.user;
            resolve(currentUser);
          } catch (signInErr) {
            console.warn('Anonymous sign-in error:', signInErr);
            resolve(null);
          }
        }
      });
    } catch {
      resolve(null);
    }
  });

  return authInitPromise;
}

export function getFirestoreDb(): Firestore | null {
  return initFirebase().db;
}
