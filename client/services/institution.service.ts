/**
 * Institution service — dashboard data and analytics from Firestore.
 */
import {
  collection, doc, getDoc, getDocs, query, where, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  Institution, InstitutionSkillGap, SimulationParams, SimulationResult,
  CurriculumMapping, CurriculumHealth,
} from '@shared/types';

const INSTITUTIONS = 'institutions';
const CURRICULUM_MAPPINGS = 'curriculumMappings';
const INDUSTRY_SIGNALS = 'industrySignals';

/**
 * Get institution profile.
 */
export async function getInstitutionById(institutionId: string): Promise<Institution | null> {
  const docSnap = await getDoc(doc(db, INSTITUTIONS, institutionId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Institution;
}

/**
 * Get curriculum mappings for an institution.
 */
export async function getCurriculumMappings(institutionId: string): Promise<CurriculumMapping[]> {
  const q = query(
    collection(db, CURRICULUM_MAPPINGS),
    where('institutionId', '==', institutionId),
    orderBy('gapSeverity')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CurriculumMapping));
}

/**
 * Run a what-if simulation.
 * This is a deterministic model — uses simple formulas, not AI.
 */
export function runSimulation(params: SimulationParams, baseline: number): SimulationResult {
  const { targetCohortSize, mentorCount, durationWeeks } = params;

  // Deterministic formula: each mentor contributes ~2%, each week above 4 adds 2%,
  // base improvement scales with cohort engagement
  const mentorEffect = Math.round(mentorCount * 2);
  const durationEffect = Math.max(0, (durationWeeks - 4) * 2);
  const cohortFactor = Math.min(1, targetCohortSize / 500); // diminishing returns above 500
  const improvement = Math.round((mentorEffect + durationEffect + 10) * cohortFactor);

  const projectedReadiness = Math.min(95, baseline + improvement);
  const eligibleStudents = Math.round(targetCohortSize * (projectedReadiness / 100));
  const opportunityMatches = Math.round(targetCohortSize * 1.17);
  const verifiedSkillsAvg = parseFloat((1.4 + improvement / 10).toFixed(1));
  const thresholdCrossings = Math.round(targetCohortSize * (improvement / 100));

  return {
    baselineReadiness: baseline,
    projectedReadiness,
    eligibleStudents,
    opportunityMatches,
    verifiedSkillsAvg,
    thresholdCrossings,
  };
}
