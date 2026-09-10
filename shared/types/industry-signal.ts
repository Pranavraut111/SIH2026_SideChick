/**
 * Industry signal / demand intelligence types.
 * Stored in `industrySignals/{id}`.
 */
import type { BaseEntity } from './common';

export interface IndustrySignal extends BaseEntity {
  organizationId?: string;
  organizationName?: string;

  /** The role this signal is about. */
  roleId?: string;
  roleName?: string;

  /** The skill this signal measures. */
  skillId: string;
  skillName: string;

  /** Demand level (0-100). */
  demandLevel: number;

  /** Demand change (e.g., "+31%"). */
  demandChange: string;

  /** Student readiness for this skill (0-100). */
  studentReadiness: number;

  /** Time period for this signal. */
  period: string;

  /** Geographic location. */
  location?: string;

  /** Source of this data. */
  source: 'platform_analytics' | 'industry_survey' | 'job_posting_analysis' | 'seeded';
}

/** Demand chain entry for the UI demand visualization. */
export interface DemandChainEntry {
  companies: number;
  role: string;
  skill: string;
  opportunities: number;
}
