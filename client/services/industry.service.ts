/**
 * Industry service — organization profiles, talent discovery, and demand signals.
 */
import {
  collection, doc, getDoc, getDocs, query, where, orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Organization, IndustrySignal, TalentCandidate } from '@shared/types';

const ORGANIZATIONS = 'organizations';
const INDUSTRY_SIGNALS = 'industrySignals';
const STUDENTS = 'students';

/**
 * Get organization profile.
 */
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const docSnap = await getDoc(doc(db, ORGANIZATIONS, orgId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Organization;
}

/**
 * Get industry demand signals.
 */
export async function getIndustryDemandSignals(limit = 10): Promise<IndustrySignal[]> {
  const q = query(
    collection(db, INDUSTRY_SIGNALS),
    orderBy('demandLevel', 'desc'),
    firestoreLimit(limit)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as IndustrySignal));
}

/**
 * Get demand signals for a specific skill.
 */
export async function getSkillDemandSignals(skillId: string): Promise<IndustrySignal[]> {
  const q = query(
    collection(db, INDUSTRY_SIGNALS),
    where('skillId', '==', skillId),
    orderBy('demandLevel', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as IndustrySignal));
}

/**
 * Discover talent: get students matching certain criteria.
 * Used by industry users for talent pool search.
 */
export async function discoverTalent(
  minReadiness: number = 50,
  limit = 20
): Promise<TalentCandidate[]> {
  const q = query(
    collection(db, STUDENTS),
    where('readinessScore', '>=', minReadiness),
    orderBy('readinessScore', 'desc'),
    firestoreLimit(limit)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const score = data.readinessScore || 0;
    return {
      studentId: d.id,
      displayName: data.displayName || '',
      department: data.department || '',
      batch: data.batch || '',
      institutionName: '', // would need a join/denormalization
      compatibility: score,
      skills: '',  // populated via skill profiles in a richer query
      verifiedProjects: `${data.metrics?.evidenceCount || 0} verified`,
      readinessSegment: score >= 80 ? 'ready_now' : score >= 60 ? 'near_ready' : 'developing',
    } as TalentCandidate;
  });
}
