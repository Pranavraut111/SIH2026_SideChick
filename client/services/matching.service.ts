/**
 * Matching service.
 *
 * The scoring algorithm itself now lives in `@shared/engine` so the server and the
 * browser run the *same* code. Two entry points, deliberately different in authority:
 *
 *   `calculateMatch`      — local preview. Instant, no round-trip, safe to run while a
 *                           student browses. Never persisted.
 *   `fetchAuthoritativeMatches` — the server's scores. These are what a recruiter sees
 *                           and what gets stored on an application.
 *
 * Because both call one implementation, the preview and the authoritative score agree.
 */
import { auth } from '@/lib/firebase';
import type { MatchResult } from '@shared/types';

export { calculateMatch } from '@shared/engine';

/**
 * Ask the server to score this student against active opportunities.
 *
 * @param studentId      The student to score (the server enforces ownership).
 * @param opportunityIds Restrict to specific opportunities; omit to score all active ones.
 */
export async function fetchAuthoritativeMatches(
  studentId: string,
  opportunityIds?: string[]
): Promise<MatchResult[]> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to view your matches.');

  const response = await fetch('/api/matching/opportunities', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ studentId, opportunityIds }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not load your matches.');
  return data.matches as MatchResult[];
}
