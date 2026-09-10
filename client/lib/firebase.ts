/**
 * Firebase Client SDK initialization.
 * All Firebase client-side services are initialized here and exported as singletons.
 *
 * Configuration is read from VITE_ environment variables.
 * Create a .env.local file (gitignored) with your Firebase project config.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Firebase app instance. */
export const app = initializeApp(firebaseConfig);

/** Firebase Auth instance. */
export const auth = getAuth(app);

/** Firestore database instance. */
export const db = getFirestore(app);

/** Firebase Storage instance. */
export const storage = getStorage(app);

/**
 * Connect to Firebase emulators in development.
 * Set VITE_USE_EMULATORS=true in .env.local to enable.
 */
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8081);
  connectStorageEmulator(storage, 'localhost', 9199);
  console.log('[Firebase] Connected to emulators');
}
