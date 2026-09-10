/**
 * ProtectedRoute — gates the workspace on authentication, completed onboarding and role.
 *
 * This is a navigation convenience, **not** a security boundary. Every real access
 * decision is enforced server-side (`requireAuth` / `requireRole`) and in
 * `firestore.rules`. Hiding a route in the client stops nothing.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@shared/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** If specified, only users with one of these roles can access. */
  allowedRoles?: UserRole[];
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080809]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#b69ce7]" />
        <span className="font-mono text-xs text-white/40">Loading…</span>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { firebaseUser, userProfile, role, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed in with Firebase Auth but no ShikshaSetu profile yet — this is the Google
  // sign-in path, where the account exists before a role has been chosen. Send them to
  // finish onboarding rather than into a workspace with no profile behind it.
  if (!role || !userProfile) {
    return <Navigate to="/signup?google=true" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
