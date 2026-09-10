/**
 * Opportunity types.
 * Stored in `opportunities/{id}`.
 */
import type { BaseEntity, LocationMode, DifficultyLevel } from './common';

export type OpportunityType =
  | 'internship'
  | 'job'
  | 'apprenticeship'
  | 'project'
  | 'mentorship'
  | 'learning_program'
  | 'workshop'
  | 'fdp'
  | 'research_project'
  | 'consultancy'
  | 'industry_mission';

export type OpportunityStatus = 'draft' | 'active' | 'closed' | 'archived';

export interface Opportunity extends BaseEntity {
  type: OpportunityType;
  title: string;
  description: string;

  /** Organization that posted this. */
  organizationId: string;
  organizationName: string; // denormalized

  /** Skills required for this opportunity. */
  requiredSkills: OpportunitySkill[];

  /** Nice-to-have skills. */
  preferredSkills?: OpportunitySkill[];

  /** Eligibility criteria. */
  eligibility?: EligibilityCriteria;

  /** Location details. */
  location?: string;
  mode: LocationMode;

  /** Duration in human-readable form (e.g., "3 months", "6 weeks"). */
  duration?: string;

  /** Compensation. */
  stipend?: string;
  salary?: string;

  /** Application deadline. */
  deadline?: BaseEntity['createdAt'];

  /** Current status. */
  status: OpportunityStatus;

  /** Who created this opportunity. */
  createdBy: string;

  /** Difficulty level. */
  difficulty?: DifficultyLevel;

  /** Number of positions available. */
  positions?: number;

  /** Number of applications received. */
  applicationCount: number;
}

export interface OpportunitySkill {
  skillId: string;
  skillName: string;
  minimumLevel: number;
}

export interface EligibilityCriteria {
  departments?: string[];
  minBatch?: string;
  maxBatch?: string;
  minReadiness?: number;
  requiredVerifications?: number;
}
