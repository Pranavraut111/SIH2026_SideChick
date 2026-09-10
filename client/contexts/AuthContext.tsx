/**
 * AuthContext — provides authentication state and actions to the React tree.
 * Supports Email/Password and Google sign-in.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  onAuthChange,
  signIn,
  signUp,
  signOut,
  signInWithGoogle as googleSignIn,
  setupProfile,
  getCurrentUserRole,
} from '@/services/auth.service';
import type { User, UserRole } from '@shared/types';

interface AuthState {
  firebaseUser: FirebaseUser | null | undefined;
  userProfile: User | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role: UserRole, options?: { institutionId?: string; organizationId?: string; details?: Record<string, unknown> }) => Promise<void>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  setupGoogleProfile: (
    role: UserRole,
    options?: { institutionId?: string; organizationId?: string; details?: Record<string, unknown> }
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: undefined,
    userProfile: null,
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // `onAuthStateChanged` ignores whatever its callback returns, so the profile
    // listener cannot be cleaned up from inside it. Holding the unsubscribe in a ref
    // and tearing it down on the next auth transition prevents listeners accumulating
    // across sign-in/sign-out cycles — and stops a stale listener firing
    // permission-denied errors after the user signs out.
    let profileUnsubscribe: (() => void) | null = null;
    let cancelled = false;

    const detachProfile = () => {
      profileUnsubscribe?.();
      profileUnsubscribe = null;
    };

    const unsubscribeAuth = onAuthChange(async (firebaseUser) => {
      detachProfile();

      if (!firebaseUser) {
        if (!cancelled) {
          setState({ firebaseUser: null, userProfile: null, role: null, loading: false, error: null });
        }
        return;
      }

      try {
        const role = await getCurrentUserRole();
        if (cancelled) return;

        profileUnsubscribe = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snapshot) => {
            if (cancelled) return;
            const userProfile = snapshot.exists()
              ? ({ id: snapshot.id, ...snapshot.data() } as User)
              : null;
            setState({ firebaseUser, userProfile, role, loading: false, error: null });
          },
          (error) => {
            if (cancelled) return;
            console.error('Error listening to user profile:', error);
            setState((prev) => ({ ...prev, firebaseUser, role, loading: false, error: 'Failed to load profile' }));
          }
        );
      } catch (err) {
        if (cancelled) return;
        console.error('Error during auth initialization:', err);
        setState({ firebaseUser, userProfile: null, role: null, loading: false, error: 'Auth initialization failed' });
      }
    });

    return () => {
      cancelled = true;
      detachProfile();
      unsubscribeAuth();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signIn(email, password);
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false, error: err.message || 'Sign in failed' }));
      throw err;
    }
  };

  const handleSignUp = async (
    email: string, password: string, displayName: string, role: UserRole,
    options?: { institutionId?: string; organizationId?: string; details?: Record<string, unknown> }
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await signUp(email, password, displayName, role, options);
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false, error: err.message || 'Sign up failed' }));
      throw err;
    }
  };

  const handleSignInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { isNewUser } = await googleSignIn();
      if (!isNewUser) {
        // Existing user — auth listener will load their profile
      }
      setState((prev) => ({ ...prev, loading: false }));
      return { isNewUser };
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false, error: err.message || 'Google sign in failed' }));
      throw err;
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSetupGoogleProfile = async (
    role: UserRole,
    options?: { institutionId?: string; organizationId?: string; details?: Record<string, unknown> }
  ) => {
    const user = state.firebaseUser;
    if (!user) throw new Error('No user');
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await setupProfile(user.uid, role, user.displayName || user.email || 'User', options);
      // Auth listener will pick up the new profile
    } catch (err: any) {
      setState((prev) => ({ ...prev, loading: false, error: err.message || 'Profile setup failed' }));
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signInWithGoogle: handleSignInWithGoogle,
        setupGoogleProfile: handleSetupGoogleProfile,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
