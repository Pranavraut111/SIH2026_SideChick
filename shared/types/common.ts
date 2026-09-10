/**
 * Common types and utilities shared across all domain entities.
 */
import type { Timestamp } from 'firebase/firestore';

/** Firestore document base fields present on every entity. */
export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** User roles in the ShikshaSetu ecosystem. */
export type UserRole = 'student' | 'faculty' | 'industry' | 'institution';

/** Generic pagination parameters for list queries. */
export interface PaginationParams {
  limit: number;
  cursor?: string;
}

/** Generic paginated response wrapper. */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

/** Status values used across multiple entities. */
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';

/** Location mode for opportunities and events. */
export type LocationMode = 'onsite' | 'remote' | 'hybrid';

/** Difficulty levels. */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
