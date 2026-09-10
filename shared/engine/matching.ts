/**
 * Explainable matching engine.
 *
 * A deterministic, weighted scoring system — not a black-box model. Every component is
 * a named, inspectable number, and the score is reproducible from the inputs.
 *
 * This lives in `shared/` because the server is the authority on match scores (a student
 * must not be able to submit their own) while the client renders the same numbers for
 * preview. One implementation, two callers — no drift between what a student is shown
 * and what a recruiter is shown.
 */
import type {
  MatchResult,
  MatchComponents,
  MatchedSkill,
  MissingSkill,
  MatchWeights,
} from '../types/matching';
import type { SkillProfile } from '../types/skill';
import type { Opportunity } from '../types/opportunity';
import type { Student } from '../types/student';
import { DEFAULT_MATCH_WEIGHTS } from '../types/matching';
import { clampScore } from './skill-status';

/**
 * Score a student against an opportunity.
 *
 * @param student       Student profile (department, readiness, evidence metrics)
 * @param skillProfiles The student's measured Skill DNA
 * @param opportunity   The opportunity, with its declared skill requirements
 * @param weights       Component weights; defaults to `DEFAULT_MATCH_WEIGHTS`
 */
export function calculateMatch(
  student: Student,
  skillProfiles: SkillProfile[],
  opportunity: Opportunity,
  weights: MatchWeights = DEFAULT_MATCH_WEIGHTS
): MatchResult {
  const { skillScore, matched, missing } = computeSkillCompatibility(skillProfiles, opportunity);
  const evidenceScore = computeEvidenceQuality(skillProfiles, opportunity);
  const { eligibilityScore, eligibilityStatus } = computeEligibility(student, opportunity);
  const projectScore = computeProjectRelevance(skillProfiles, opportunity);
  const experienceScore = computeExperience(student);
  const careerScore = computeCareerPreference(student, opportunity);
  const locationScore = computeLocationPreference(student, opportunity);

  const components: MatchComponents = {
    skillCompatibility: skillScore,
    evidenceQuality: evidenceScore,
    eligibility: eligibilityScore,
    projectRelevance: projectScore,
    experience: experienceScore,
    careerPreference: careerScore,
    locationPreference: locationScore,
  };

  // Normalize by the total weight so a custom weight set that does not sum to 1 still
  // produces a 0-100 score.
  const weightTotal =
    weights.skillCompatibility +
    weights.evidenceQuality +
    weights.eligibility +
    weights.projectRelevance +
    weights.experience +
    weights.careerPreference +
    weights.locationPreference;

  const weighted =
    components.skillCompatibility * weights.skillCompatibility +
    components.evidenceQuality * weights.evidenceQuality +
    components.eligibility * weights.eligibility +
    components.projectRelevance * weights.projectRelevance +
    components.experience * weights.experience +
    components.careerPreference * weights.careerPreference +
    components.locationPreference * weights.locationPreference;

  const matchScore = weightTotal > 0 ? clampScore(weighted / weightTotal) : 0;

  return {
    studentId: student.id,
    opportunityId: opportunity.id,
    matchScore,
    components,
    matchedSkills: matched,
    missingSkills: missing,
    eligibilityStatus,
    reasons: generateReasons(components, matched, missing, eligibilityStatus),
  };
}

// ============================================
// Components
// ============================================

function computeSkillCompatibility(
  profiles: SkillProfile[],
  opportunity: Opportunity
): { skillScore: number; matched: MatchedSkill[]; missing: MissingSkill[] } {
  const required = opportunity.requiredSkills ?? [];

  // An opportunity that declares no skills cannot discriminate between candidates.
  // A neutral score is honest; 100 would imply a perfect fit we have not established.
  if (!required.length) return { skillScore: 50, matched: [], missing: [] };

  const matched: MatchedSkill[] = [];
  const missing: MissingSkill[] = [];
  let coverageTotal = 0;

  for (const requirement of required) {
    const profile = profiles.find((p) => p.skillId === requirement.skillId);
    const studentLevel = clampScore(profile?.proficiency ?? 0);
    const requiredLevel = clampScore(requirement.minimumLevel);
    const meets = studentLevel >= requiredLevel;

    // A requirement of 0 is trivially met — guard the division rather than emitting NaN.
    coverageTotal += requiredLevel <= 0 ? 1 : Math.min(studentLevel / requiredLevel, 1);

    if (meets || studentLevel > 0) {
      matched.push({
        skillId: requirement.skillId,
        skillName: requirement.skillName,
        studentLevel,
        requiredLevel,
        meets,
      });
    }

    if (!meets) {
      missing.push({
        skillId: requirement.skillId,
        skillName: requirement.skillName,
        requiredLevel,
        studentLevel,
        gap: requiredLevel - studentLevel,
      });
    }
  }

  return { skillScore: clampScore((coverageTotal / required.length) * 100), matched, missing };
}

function computeEvidenceQuality(profiles: SkillProfile[], opportunity: Opportunity): number {
  const required = opportunity.requiredSkills ?? [];
  const relevant = profiles.filter((p) => required.some((rs) => rs.skillId === p.skillId));
  if (!relevant.length) return 0;

  // Half the score is breadth of evidence (capped at 5 items per skill), half is the
  // confidence attached to that evidence.
  const avgEvidence = relevant.reduce((sum, p) => sum + Math.min(p.evidenceCount ?? 0, 5), 0) / relevant.length;
  const avgConfidence = relevant.reduce((sum, p) => sum + clampScore(p.confidence), 0) / relevant.length;

  return clampScore((avgEvidence / 5) * 50 + (avgConfidence / 100) * 50);
}

function computeEligibility(
  student: Student,
  opportunity: Opportunity
): { eligibilityScore: number; eligibilityStatus: MatchResult['eligibilityStatus'] } {
  const criteria = opportunity.eligibility;
  if (!criteria) return { eligibilityScore: 100, eligibilityStatus: 'eligible' };

  let checks = 0;
  let passed = 0;

  if (criteria.departments?.length) {
    checks++;
    if (criteria.departments.includes(student.department)) passed++;
  }

  if (typeof criteria.minReadiness === 'number') {
    checks++;
    if (student.readinessScore >= criteria.minReadiness) passed++;
  }

  if (criteria.minBatch) {
    checks++;
    if (student.batch && student.batch >= criteria.minBatch) passed++;
  }

  if (criteria.maxBatch) {
    checks++;
    if (student.batch && student.batch <= criteria.maxBatch) passed++;
  }

  if (typeof criteria.requiredVerifications === 'number') {
    checks++;
    if ((student.metrics?.verifiedSkills ?? 0) >= criteria.requiredVerifications) passed++;
  }

  if (checks === 0) return { eligibilityScore: 100, eligibilityStatus: 'eligible' };

  const ratio = passed / checks;
  return {
    eligibilityScore: clampScore(ratio * 100),
    eligibilityStatus: ratio >= 1 ? 'eligible' : ratio >= 0.5 ? 'partially_eligible' : 'ineligible',
  };
}

function computeProjectRelevance(profiles: SkillProfile[], opportunity: Opportunity): number {
  const required = opportunity.requiredSkills ?? [];
  if (!required.length) return 0;
  const verified = profiles.filter(
    (p) => p.status === 'verified' && required.some((rs) => rs.skillId === p.skillId)
  );
  return clampScore((verified.length / required.length) * 100);
}

function computeExperience(student: Student): number {
  return clampScore((student.metrics?.evidenceCount ?? 0) * 10);
}

function computeCareerPreference(student: Student, opportunity: Opportunity): number {
  if (!student.careerTarget) return 50;
  const target = student.careerTarget.toLowerCase();
  const title = opportunity.title.toLowerCase();
  // Overlap between the student's stated target and the opportunity title, in either
  // direction ("ML Engineer" ↔ "Junior ML Engineer").
  if (title.includes(target) || target.includes(title)) return 100;

  const targetWords = target.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const overlap = targetWords.filter((word) => title.includes(word)).length;
  if (!targetWords.length) return 50;
  return clampScore(50 + (overlap / targetWords.length) * 50);
}

function computeLocationPreference(_student: Student, opportunity: Opportunity): number {
  // Students have no declared location preference yet, so the only honest signal is how
  // accessible the opportunity is regardless of where the student lives.
  if (opportunity.mode === 'remote') return 100;
  if (opportunity.mode === 'hybrid') return 75;
  return 50;
}

// ============================================
// Explanation
// ============================================

function generateReasons(
  components: MatchComponents,
  matched: MatchedSkill[],
  missing: MissingSkill[],
  eligibility: string
): string[] {
  const reasons: string[] = [];

  const meetsCount = matched.filter((m) => m.meets).length;
  if (meetsCount > 0) {
    reasons.push(`${meetsCount} skill${meetsCount > 1 ? 's' : ''} meet or exceed requirements.`);
  }

  if (missing.length > 0) {
    const names = missing.slice(0, 3).map((m) => m.skillName).join(', ');
    reasons.push(`Gap in ${names}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}.`);
  }

  if (components.evidenceQuality >= 70) {
    reasons.push('Strong evidence quality across matched skills.');
  } else if (components.evidenceQuality < 40) {
    reasons.push('Evidence is limited — completing projects would strengthen this match.');
  }

  if (eligibility === 'ineligible') {
    reasons.push('Does not meet eligibility criteria.');
  } else if (eligibility === 'partially_eligible') {
    reasons.push('Partially meets eligibility criteria.');
  }

  return reasons;
}
