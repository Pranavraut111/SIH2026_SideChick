/**
 * Authentication service.
 * Wraps Firebase Auth operations behind a clean API.
 * Supports Email/Password and Google sign-in.
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User, UserRole, SetupProfileRequest } from '@shared/types';

const googleProvider = new GoogleAuthProvider();

/**
 * Sign up a new user with email/password, then set up their profile
 * via the server endpoint (which sets custom claims).
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
  options?: { institutionId?: string; organizationId?: string; details?: Record<string, unknown> }
): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  await updateProfile(user, { displayName });

  try {
    await setupProfile(user.uid, role, displayName, options);
  } catch (error) {
    // The Auth account now exists without a ShikshaSetu profile. Sign out so the user
    // is not left in a half-created state; they can sign in again and `ProtectedRoute`
    // will route them back to onboarding to finish.
    await firebaseSignOut(auth).catch(() => undefined);
    throw error;
  }

  await user.getIdToken(true);
  return user;
}

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/**
 * Sign in with Google popup.
 * Returns { user, isNewUser } so the caller can redirect to role selection if needed.
 */
export async function signInWithGoogle(): Promise<{ user: FirebaseUser; isNewUser: boolean }> {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  return { user, isNewUser: !userDoc.exists() };
}

/**
 * Set up a user's profile (custom claims + Firestore docs) via the server endpoint.
 */
export async function setupProfile(
  uid: string,
  role: UserRole,
  displayName: string,
  options?: { institutionId?: string; organizationId?: string; details?: Record<string, unknown> }
): Promise<void> {
  const payload: SetupProfileRequest = {
    uid,
    role,
    displayName,
    institutionId: options?.institutionId,
    organizationId: options?.organizationId,
    details: options?.details,
  };

  const response = await fetch('/api/auth/setup-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    // Surface the server's validation detail — "Select your institution" is far more
    // actionable than a generic failure, and these are the errors users actually hit.
    const detail = Array.isArray(data.issues) && data.issues.length
      ? data.issues.map((issue: { message: string }) => issue.message).join(' ')
      : data.error;
    throw new Error(detail || 'Failed to set up user profile');
  }

  const user = auth.currentUser;
  if (user) await user.getIdToken(true);
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Get the current user's ShikshaSetu profile from Firestore. */
export async function getCurrentUserProfile(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (!userDoc.exists()) return null;
  return { id: userDoc.id, ...userDoc.data() } as User;
}

/** Get the current user's role from their ID token claims. */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const tokenResult = await user.getIdTokenResult();
  return (tokenResult.claims.role as UserRole) || null;
}

/** Subscribe to auth state changes. */
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
