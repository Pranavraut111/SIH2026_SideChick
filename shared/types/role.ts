/**
 * Career role types.
 * Stored in `roles/{id}`.
 */
import type { BaseEntity } from './common';

/** A target career role in the skill intelligence system. */
export interface CareerRole extends BaseEntity {
  title: string;
  domain: string;
  description?: string;

  /** Skills required for this role with minimum proficiency. */
  requiredSkills: RoleSkillRequirement[];

  /** Current market demand metrics. */
  demand: RoleDemand;

  /** Number of open opportunities matching this role. */
  opportunityCount: number;
}

export interface RoleSkillRequirement {
  skillId: string;
  skillName: string;
  minimumLevel: number;
  weight: number; // 0-1, how important this skill is for the role
}

export interface RoleDemand {
  /** Demand growth percentage (e.g., "+34%"). */
  growth: string;
  /** Absolute demand index (0-100). */
  demandIndex: number;
  /** Trend direction. */
  trend: 'rising' | 'stable' | 'declining';
  /** Time period for the demand data. */
  period: string;
}

/** Student's readiness assessment against a specific role. */
export interface RoleReadiness {
  roleId: string;
  roleName: string;
  readinessScore: number;
  gaps: string;
  demand: RoleDemand;
  opportunityCount: number;
}
