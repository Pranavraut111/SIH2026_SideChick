/**
 * Role readiness — the platform's headline metric.
 *
 * Readiness answers one question: *how much of what this role demands does the student
 * actually have evidence for?* That makes three properties non-negotiable:
 *
 *  1. **It spans every required skill**, not just the ones a student happened to be
 *     assessed on. A skill with no evidence contributes zero — silence is not credit.
 *  2. **It respects the role's own weights.** A role that declares Python at weight 0.25
 *     and MLOps at 0.10 means it; averaging the two flat would misreport readiness.
 *  3. **Per-skill credit is capped at 100%.** Exceeding a requirement does not buy
 *     headroom to be short elsewhere.
 *
 * The previous implementation averaged raw proficiency across only the assessed skills,
 * so a student assessed on one easy skill could report ~90% "ready" for a role they had
 * barely started.
 */
import type { RoleSkillRequirement } from '../types/role';
import { clampScore } from './skill-status';

/** The minimum a student needs to hold against a required skill for it to count. */
export interface ProficiencySource {
  skillId: string;
  proficiency: number;
}

export interface ReadinessBreakdown {
  /** Weighted readiness, 0-100. */
  score: number;
  /** Per-skill contribution, ordered by the requirement list. */
  contributions: SkillContribution[];
  /** Required skills the student has no measured proficiency for at all. */
  unmeasuredSkills: string[];
}

export interface SkillContribution {
  skillId: string;
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  /** How much of this requirement is satisfied, 0-1. */
  coverage: number;
  /** The requirement's normalized weight, 0-1. */
  weight: number;
  /** `coverage × weight`, i.e. the points this skill adds to the score. */
  contribution: number;
}

/**
 * Compute weighted readiness for a target role.
 *
 * Returns 0 when the role declares no requirements — an unspecified role cannot make
 * anyone ready, and reporting 100% there would be actively misleading.
 */
export function computeRoleReadiness(
  profiles: ProficiencySource[],
  requirements: RoleSkillRequirement[]
): ReadinessBreakdown {
  if (!requirements.length) {
    return { score: 0, contributions: [], unmeasuredSkills: [] };
  }

  const levels = new Map(profiles.map((p) => [p.skillId, clampScore(p.proficiency)]));

  // Weights are normalized rather than assumed to sum to 1, so a role authored with
  // weights of 1/1/1 (or 0) still produces a sane score.
  const rawWeights = requirements.map((r) => (Number.isFinite(r.weight) && r.weight > 0 ? r.weight : 0));
  const weightTotal = rawWeights.reduce((sum, w) => sum + w, 0);
  const useEqualWeights = weightTotal <= 0;

  const unmeasuredSkills: string[] = [];

  const contributions: SkillContribution[] = requirements.map((requirement, index) => {
    const measured = levels.get(requirement.skillId);
    if (measured === undefined) unmeasuredSkills.push(requirement.skillName);

    const currentLevel = measured ?? 0;
    const requiredLevel = clampScore(requirement.minimumLevel);
    const coverage = requiredLevel <= 0 ? 1 : Math.min(currentLevel / requiredLevel, 1);
    const weight = useEqualWeights ? 1 / requirements.length : rawWeights[index] / weightTotal;

    return {
      skillId: requirement.skillId,
      skillName: requirement.skillName,
      currentLevel,
      requiredLevel,
      coverage,
      weight,
      contribution: coverage * weight,
    };
  });

  const score = Math.round(contributions.reduce((sum, c) => sum + c.contribution, 0) * 100);

  return { score: Math.min(score, 100), contributions, unmeasuredSkills };
}
