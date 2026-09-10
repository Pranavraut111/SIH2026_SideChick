/**
 * Deterministic derivation of skill status and confidence.
 *
 * The product rule is explicit: an LLM may judge the *quality of an answer*, but it may
 * never decide what a skill's permanent status is. Given a proficiency score, status is
 * a pure function — the same number always yields the same label, for every student.
 */
import type { SkillStatus } from '../types/skill';

/** Proficiency at or above this counts as verified evidence of the skill. */
export const VERIFIED_THRESHOLD = 75;

/** Below this, the skill is a critical gap regardless of how it was sourced. */
export const CRITICAL_THRESHOLD = 40;

/**
 * Map a proficiency score to a skill status.
 *
 * `hasEvidence` distinguishes "assessed and scored low" (`critical_gap`) from
 * "never attempted" (`not_started`) — both sit below the critical threshold but they
 * call for different interventions.
 */
export function deriveSkillStatus(proficiency: number, hasEvidence: boolean): SkillStatus {
  const score = clampScore(proficiency);
  if (score >= VERIFIED_THRESHOLD) return 'verified';
  if (score >= CRITICAL_THRESHOLD) return 'in_progress';
  if (!hasEvidence) return 'not_started';
  return 'critical_gap';
}

/** Coerce any numeric input into a valid 0-100 integer score. */
export function clampScore(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(Math.min(Math.max(numeric, 0), 100));
}

/**
 * Human-readable recency label for a verification timestamp.
 * Returns "Never" when the skill has never been verified.
 */
export function describeRecency(verifiedAt: Date | null | undefined, now: Date = new Date()): string {
  if (!verifiedAt) return 'Never';
  const days = Math.floor((now.getTime() - verifiedAt.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}
