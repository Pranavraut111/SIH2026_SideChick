/**
 * Matching engine types.
 * Used by the explainable matching service.
 */

/** Configurable weights for the matching algorithm. */
export interface MatchWeights {
  skillCompatibility: number;   // default 0.50
  evidenceQuality: number;      // default 0.15
  eligibility: number;          // default 0.10
  projectRelevance: number;     // default 0.10
  experience: number;           // default 0.05
  careerPreference: number;     // default 0.05
  locationPreference: number;   // default 0.05
}

export const DEFAULT_MATCH_WEIGHTS: MatchWeights = {
  skillCompatibility: 0.50,
  evidenceQuality: 0.15,
  eligibility: 0.10,
  projectRelevance: 0.10,
  experience: 0.05,
  careerPreference: 0.05,
  locationPreference: 0.05,
};

/** Full match result returned by the matching engine. */
export interface MatchResult {
  studentId: string;
  opportunityId: string;
  matchScore: number; // 0-100

  /** Individual component scores. */
  components: MatchComponents;

  /** Skills the student has that match. */
  matchedSkills: MatchedSkill[];

  /** Skills the opportunity requires but the student lacks. */
  missingSkills: MissingSkill[];

  /** Eligibility check result. */
  eligibilityStatus: 'eligible' | 'partially_eligible' | 'ineligible';

  /** Human-readable reasons for the match score. */
  reasons: string[];
}

export interface MatchComponents {
  skillCompatibility: number;
  evidenceQuality: number;
  eligibility: number;
  projectRelevance: number;
  experience: number;
  careerPreference: number;
  locationPreference: number;
}

export interface MatchedSkill {
  skillId: string;
  skillName: string;
  studentLevel: number;
  requiredLevel: number;
  /** Whether the student meets or exceeds the requirement. */
  meets: boolean;
}

export interface MissingSkill {
  skillId: string;
  skillName: string;
  requiredLevel: number;
  studentLevel: number;
  gap: number;
}
