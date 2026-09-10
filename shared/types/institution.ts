/**
 * Institution types.
 * Stored in `institutions/{id}`.
 */
import type { BaseEntity } from './common';

export interface Institution extends BaseEntity {
  name: string;
  type: 'university' | 'college' | 'polytechnic' | 'iit' | 'nit' | 'iiit' | 'other';
  code?: string; // AICTE code or similar
  location: string;
  departments: string[];

  /** Aggregate metrics for the institution dashboard. */
  metrics: InstitutionMetrics;

  /** Admin user IDs. */
  adminIds: string[];
}

export interface InstitutionMetrics {
  totalStudents: number;
  placementReadiness: number;       // 0-100
  industryAlignment: number;        // 0-100
  activeInterventions: number;
  verifiedSkillsAvg: number;
  criticalGapCount: number;
  placementRate?: number;           // 0-100
}

/** Skill gap heatmap entry used by the institution command center. */
export interface InstitutionSkillGap {
  skillId: string;
  skillName: string;
  /** Readiness levels per department cohort. */
  departmentReadiness: Record<string, number>;
  /** Industry demand level. */
  industryDemand: number;
  /** Industry demand change. */
  demandChange: string;
  /** Number of affected students. */
  affectedStudents: number;
  /** Gap severity. */
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/** What-if simulation parameters. */
export interface SimulationParams {
  targetCohortSize: number;
  mentorCount: number;
  durationWeeks: number;
  targetSkills: string[];
}

/** What-if simulation result. */
export interface SimulationResult {
  baselineReadiness: number;
  projectedReadiness: number;
  eligibleStudents: number;
  opportunityMatches: number;
  verifiedSkillsAvg: number;
  thresholdCrossings: number;
}
