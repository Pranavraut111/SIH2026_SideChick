/**
 * User types — the authentication identity layer.
 * Every authenticated user has a doc in the `users` collection.
 * Role-specific profile data lives in separate collections (students, faculty, etc.)
 */
import type { BaseEntity, UserRole } from './common';

/** Core user document stored in `users/{uid}`. */
export interface User extends BaseEntity {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;

  /**
   * Reference to the role-specific profile document.
   * e.g., "students/abc123" or "faculty/def456"
   */
  profileRef?: string;

  /** Institution this user belongs to (students, faculty, institution admins). */
  institutionId?: string;

  /** Organization this user belongs to (industry users). */
  organizationId?: string;

  /** Whether the user has completed onboarding. */
  onboardingComplete: boolean;

  /** Last login timestamp. */
  lastLoginAt?: BaseEntity['createdAt'];
}

/** Custom claims stored in Firebase Auth token. */
export interface UserClaims {
  role: UserRole;
  institutionId?: string;
  organizationId?: string;
}

/** User creation payload (signup form). */
export interface CreateUserPayload {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  institutionId?: string;
  organizationId?: string;
}

/** Profile setup request sent to server after Firebase Auth signup. */
export interface SetupProfileRequest {
  uid: string;
  role: UserRole;
  displayName: string;
  institutionId?: string;
  organizationId?: string;
  /** Role-specific extra fields. */
  details?: Record<string, unknown>;
}

export interface SetupProfileResponse {
  success: boolean;
  profileId: string;
}
