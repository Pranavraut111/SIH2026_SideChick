/**
 * Shared API types and domain model re-exports.
 *
 * Import domain types from '@shared/types' for full type definitions.
 * This file re-exports them for convenience and maintains backward compatibility.
 */

// Re-export all domain types
export type {
  BaseEntity,
  UserRole,
  PaginationParams,
  PaginatedResult,
  VerificationStatus,
  LocationMode,
  DifficultyLevel,
} from './types/common';

export type {
  User,
  UserClaims,
  CreateUserPayload,
  SetupProfileRequest,
  SetupProfileResponse,
} from './types/user';

export type { Student, StudentMetrics } from './types/student';

export type {
  Skill,
  SkillCategory,
  SkillProfile,
  SkillStatus,
  SkillSource,
  SkillEvidence,
  EvidenceType,
  SkillGap,
  GapSeverity,
} from './types/skill';

export type {
  CareerRole,
  RoleSkillRequirement,
  RoleDemand,
  RoleReadiness,
} from './types/role';

export type {
  Opportunity,
  OpportunityType,
  OpportunityStatus,
  OpportunitySkill,
  EligibilityCriteria,
} from './types/opportunity';

export type {
  Application,
  ApplicationStatus,
  MatchDetails,
} from './types/application';

export type {
  Roadmap,
  RoadmapNode,
  RoadmapNodeType,
  RoadmapNodeStatus,
  RoadmapEdge,
  RoadmapResource,
} from './types/roadmap';

export type {
  MatchWeights,
  MatchResult,
  MatchComponents,
  MatchedSkill,
  MissingSkill,
} from './types/matching';

export { DEFAULT_MATCH_WEIGHTS } from './types/matching';

/** Legacy — kept for backward compatibility with existing demo endpoint. */
export interface DemoResponse {
  message: string;
}
