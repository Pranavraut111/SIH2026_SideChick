/**
 * Organization (industry) types.
 * Stored in `organizations/{id}`.
 */
import type { BaseEntity } from './common';

export interface Organization extends BaseEntity {
  name: string;
  domain: string; // e.g., "Technology", "Finance"
  description?: string;
  logoURL?: string;
  website?: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  locations: string[];

  /** Admin user IDs. */
  adminIds: string[];

  /** Industry metrics. */
  metrics: OrganizationMetrics;
}

export interface OrganizationMetrics {
  activeOpportunities: number;
  totalApplications: number;
  hiredCount: number;
  averageMatchScore: number;
}

/** Talent pool segment for industry talent discovery. */
export interface TalentCandidate {
  studentId: string;
  displayName: string;
  department: string;
  batch: string;
  institutionName: string;
  compatibility: number;
  skills: string;
  verifiedProjects: string;
  readinessSegment: 'ready_now' | 'near_ready' | 'developing';
}

/** Talent pool composition entry. */
export interface TalentPoolSegment {
  domain: string;
  count: number;
  color: string;
}
