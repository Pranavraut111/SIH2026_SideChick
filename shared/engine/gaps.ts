/**
 * Skill gap analysis.
 *
 * Deterministic and explainable by design: every gap carries the numbers it came from,
 * a severity band, a plain-language reason and a recommended intervention. Nothing here
 * is AI-generated — an AI may later narrate this output, but it never produces it.
 */
import type { SkillGap, GapSeverity } from '../types/skill';
import { clampScore } from './skill-status';

/** Minimum skill state needed to compute a gap. */
export interface GapSkillSource {
  skillId: string;
  proficiency: number;
  category?: string;
}

/** Minimum requirement shape — matches both `RoleSkillRequirement` and `OpportunitySkill`. */
export interface GapRequirement {
  skillId: string;
  skillName: string;
  minimumLevel: number;
}

/** Severity bands, in points of shortfall. */
export const SEVERITY_BANDS: { min: number; severity: GapSeverity }[] = [
  { min: 40, severity: 'critical' },
  { min: 25, severity: 'high' },
  { min: 10, severity: 'medium' },
  { min: 1, severity: 'low' },
];

export function gapSeverity(gap: number): GapSeverity {
  if (gap <= 0) return 'none';
  return SEVERITY_BANDS.find((band) => gap >= band.min)?.severity ?? 'low';
}

function interventionFor(severity: GapSeverity, skillName: string): string {
  switch (severity) {
    case 'critical':
      return `Complete a foundational course and project in ${skillName}.`;
    case 'high':
      return `Take an assessment and complete a focused project in ${skillName}.`;
    case 'medium':
      return `Practice ${skillName} through a real-world project or industry mission.`;
    case 'low':
      return `Refresh ${skillName} with a quick assessment.`;
    default:
      return 'No action needed.';
  }
}

/**
 * Compare measured skills against a set of requirements.
 * Results are sorted largest gap first, so the caller can act on the top item.
 */
export function computeSkillGaps(
  skillProfiles: GapSkillSource[],
  requirements: GapRequirement[]
): SkillGap[] {
  return requirements
    .map((requirement) => {
      const profile = skillProfiles.find((sp) => sp.skillId === requirement.skillId);
      const currentLevel = clampScore(profile?.proficiency ?? 0);
      const requiredLevel = clampScore(requirement.minimumLevel);
      const gap = Math.max(requiredLevel - currentLevel, 0);
      const severity = gapSeverity(gap);

      return {
        skillId: requirement.skillId,
        skillName: requirement.skillName,
        category: profile?.category ?? '',
        currentLevel,
        requiredLevel,
        gap,
        severity,
        reason:
          gap === 0
            ? `${requirement.skillName} meets or exceeds the required level.`
            : `${requirement.skillName} is at ${currentLevel}% but the target role requires ${requiredLevel}%.`,
        recommendedIntervention: interventionFor(severity, requirement.skillName),
      };
    })
    .sort((a, b) => b.gap - a.gap);
}
