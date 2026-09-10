/**
 * Authoritative matching.
 *
 * POST /api/matching/opportunities  — score a student against active opportunities
 *
 * The browser may render match scores, but it does not get to decide them. The client
 * previously computed a score and passed it into the application it created, which meant
 * a student could apply with a fabricated 100% match that recruiters would then shortlist
 * on. Every score a recruiter sees now originates here, from Firestore data.
 */
import type { RequestHandler } from 'express';
import { adminDb } from '../lib/firebase-admin';
import { authedUser } from '../middleware/auth';
import { matchOpportunitiesSchema } from '../../shared/schemas';
import { calculateMatch } from '../../shared/engine';
import type { MatchResult, Opportunity, SkillProfile, Student } from '../../shared/types';

/** Firestore rejects `in` queries with more than 30 values. */
const IN_QUERY_LIMIT = 30;

/**
 * Load a student and their Skill DNA, enforcing that the caller owns the record.
 * Returns `null` after having already sent the error response.
 */
export async function loadOwnedStudent(
  studentId: string,
  callerUid: string,
  res: Parameters<RequestHandler>[1]
): Promise<{ student: Student; skillProfiles: SkillProfile[] } | null> {
  const studentSnapshot = await adminDb.collection('students').doc(studentId).get();
  if (!studentSnapshot.exists) {
    res.status(404).json({ error: 'Student profile not found' });
    return null;
  }
  if (studentSnapshot.data()?.userId !== callerUid) {
    res.status(403).json({ error: 'You can only act on your own profile' });
    return null;
  }

  const profilesSnapshot = await studentSnapshot.ref.collection('skillProfiles').get();

  return {
    student: { id: studentSnapshot.id, ...studentSnapshot.data() } as Student,
    skillProfiles: profilesSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as SkillProfile),
  };
}

/** Fetch specific opportunities by id, or every active one when no ids are given. */
async function loadOpportunities(ids?: string[]): Promise<Opportunity[]> {
  if (ids?.length) {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += IN_QUERY_LIMIT) {
      chunks.push(ids.slice(i, i + IN_QUERY_LIMIT));
    }
    const results = await Promise.all(
      chunks.map((chunk) =>
        adminDb.collection('opportunities').where('__name__', 'in', chunk).get()
      )
    );
    return results.flatMap((snapshot) =>
      snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Opportunity)
    );
  }

  const snapshot = await adminDb
    .collection('opportunities')
    .where('status', '==', 'active')
    .limit(100)
    .get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Opportunity);
}

export const handleMatchOpportunities: RequestHandler = async (req, res) => {
  const parsed = matchOpportunitiesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'studentId is required' });
    return;
  }

  try {
    const owned = await loadOwnedStudent(parsed.data.studentId, authedUser(req).uid, res);
    if (!owned) return;

    const opportunities = await loadOpportunities(parsed.data.opportunityIds);
    const matches: MatchResult[] = opportunities
      .map((opportunity) => calculateMatch(owned.student, owned.skillProfiles, opportunity))
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({ matches });
  } catch (error) {
    console.error('[Matching] matchOpportunities failed:', error);
    res.status(500).json({ error: 'Could not calculate matches' });
  }
};
