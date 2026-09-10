/**
 * Curriculum mapping types.
 * Stored in `curriculumMappings/{id}`.
 */
import type { BaseEntity } from './common';

export interface Course extends BaseEntity {
  institutionId: string;
  name: string;
  code: string;
  department: string;
  semester?: number;
  topics: string[];
  credits?: number;
}

export interface CurriculumMapping extends BaseEntity {
  courseId: string;
  courseName: string;     // denormalized
  institutionId: string;
  skillId: string;
  skillName: string;      // denormalized

  /** How well the course covers this skill (0-100). */
  coverageLevel: number;

  /** Current industry demand for this skill (0-100). */
  industryDemand: number;

  /** Gap assessment. */
  gapSeverity: 'aligned' | 'high' | 'critical' | 'missing';

  /** Recommended action. */
  recommendedAction?: string;
}

/** Aggregated curriculum health for the institution dashboard. */
export interface CurriculumHealth {
  totalMappings: number;
  alignedCount: number;
  missingSkills: number;
  industryAlignedCount: number;
  freshness: number; // 0-100 how up-to-date the curriculum is
  recommendedModuleDuration: string;
}
