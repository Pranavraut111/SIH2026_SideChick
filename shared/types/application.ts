/**
 * Application types.
 * Stored in `applications/{id}`.
 */
import type { BaseEntity } from './common';

export type ApplicationStatus =
  | 'applied'
  | 'under_review'
  | 'shortlisted'
  | 'interview'
  | 'selected'
  | 'rejected'
  | 'withdrawn'
  | 'completed';

export interface Application extends BaseEntity {
  studentId: string;
  studentName: string;    // denormalized
  opportunityId: string;
  opportunityTitle: string; // denormalized
  organizationId: string;

  status: ApplicationStatus;

  /** Explainable match result at time of application. */
  matchScore: number;
  matchDetails: MatchDetails;

  /** Timestamps for lifecycle tracking. */
  appliedAt: BaseEntity['createdAt'];
  reviewedAt?: BaseEntity['createdAt'];
  shortlistedAt?: BaseEntity['createdAt'];
  interviewAt?: BaseEntity['createdAt'];
  decidedAt?: BaseEntity['createdAt'];

  /** Notes from the reviewer. */
  reviewerNotes?: string;
}

/** Match breakdown stored with each application. */
export interface MatchDetails {
  skillCompatibility: number;
  evidenceQuality: number;
  eligibilityScore: number;
  projectRelevance: number;
  experienceScore: number;
  careerPreference: number;
  locationPreference: number;
  matchedSkills: string[];
  missingSkills: string[];
  eligibilityStatus: 'eligible' | 'partially_eligible' | 'ineligible';
  reasons: string[];
}
