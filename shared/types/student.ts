/**
 * Student domain types.
 * Student profile doc stored in `students/{id}`.
 */
import type { BaseEntity } from './common';

export interface Student extends BaseEntity {
  userId: string;
  institutionId: string;
  department: string;
  batch: string; // e.g., "2027"
  enrollmentId?: string;

  /** Display name (denormalized from user doc). */
  displayName: string;
  email: string;
  photoURL?: string;

  /** Career aspiration. */
  careerTarget?: string;
  /** Stable reference to the career-role catalog entry behind careerTarget. */
  careerTargetId?: string;

  /** Computed readiness score (0-100). */
  readinessScore: number;

  /** Number of verified skills. */
  verifiedSkillCount: number;

  /** Number of matched opportunities. */
  matchedOpportunityCount: number;

  /** Summary metrics for dashboard display. */
  metrics: StudentMetrics;
}

export interface StudentMetrics {
  totalSkills: number;
  verifiedSkills: number;
  criticalGaps: number;
  activeApplications: number;
  completedMissions: number;
  evidenceCount: number;
}
