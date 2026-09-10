/**
 * Faculty types.
 * Stored in `faculty/{id}`.
 */
import type { BaseEntity } from './common';

export interface Faculty extends BaseEntity {
  userId: string;
  institutionId: string;
  displayName: string;
  email: string;
  photoURL?: string;

  department: string;
  designation: string;
  specializations: string[];

  /** Industry exposure score (0-100). */
  industryExposure: number;
  exposureChange: string; // e.g., "+8% this year"

  /** Passport stats. */
  metrics: FacultyMetrics;
}

export interface FacultyMetrics {
  industryProjects: number;
  mentoredStudents: number;
  researchLinks: number;
  fdpCompleted: number;
  guestLectures: number;
  consultancies: number;
}

/** Recommended next step for faculty industry passport. */
export interface FacultyRecommendation {
  title: string;
  description: string;
  impact: string; // e.g., "+12 exposure"
  type: 'immersion' | 'mentoring' | 'fdp' | 'research' | 'consultancy' | 'guest_lecture';
  deadline?: string;
}
