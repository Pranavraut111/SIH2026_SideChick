/**
 * Firebase Admin SDK bootstrap — the single place the Admin app is initialized.
 *
 * Every server module that needs Firestore or Auth must import `adminDb` / `adminAuth`
 * from here rather than calling `getFirestore()` / `getAuth()` at its own module scope.
 * That previously made boot order load-bearing: `routes/assessment.ts` only worked
 * because `server/index.ts` happened to import `routes/auth.ts` (which initialized the
 * app as a side effect) first.
 */
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function bootstrap() {
  if (getApps().length > 0) return;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    const fullPath = resolve(serviceAccountPath);
    if (existsSync(fullPath)) {
      const serviceAccount = JSON.parse(readFileSync(fullPath, 'utf-8')) as ServiceAccount;
      initializeApp({ credential: cert(serviceAccount) });
      console.log('[Firebase Admin] Initialized with service account');
      return;
    }
    console.warn(`[Firebase Admin] Service account file not found: ${fullPath}`);
  }

  // Falls back to Application Default Credentials (Cloud Run, GCE, emulator, CI).
  initializeApp();
  console.log('[Firebase Admin] Initialized with application default credentials');
}

bootstrap();

/** Firestore instance backed by the Admin SDK. Bypasses security rules — authorize explicitly. */
export const adminDb = getFirestore();

/** Firebase Auth instance backed by the Admin SDK. */
export const adminAuth = getAuth();

export { FieldValue, Timestamp } from 'firebase-admin/firestore';
