/**
 * Student service — reads/writes student data from Firestore.
 */
import {
  collection, doc, getDoc, getDocs, query, where, updateDoc,
  serverTimestamp, orderBy, limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Student, SkillProfile, SkillEvidence } from '@shared/types';

/**
 * Deterministic gap analysis lives in `@shared/engine` so the server computes the same
 * numbers the student is shown. Re-exported here to keep the service-layer import path
 * stable for callers.
 */
export { computeSkillGaps } from '@shared/engine';

const STUDENTS = 'students';
const SKILL_PROFILES = 'skillProfiles';
const EVIDENCE = 'evidence';

/**
 * Get student profile by user ID (auth uid).
 */
export async function getStudentByUserId(userId: string): Promise<Student | null> {
  const q = query(collection(db, STUDENTS), where('userId', '==', userId), firestoreLimit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Student;
}

/**
 * Get student profile by student document ID.
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  const docSnap = await getDoc(doc(db, STUDENTS, studentId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Student;
}

/**
 * Get a student's Skill DNA (all skill profiles).
 */
export async function getStudentSkillDNA(studentId: string): Promise<SkillProfile[]> {
  const q = query(
    collection(db, STUDENTS, studentId, SKILL_PROFILES),
    orderBy('proficiency', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SkillProfile));
}

/**
 * Get evidence for a specific skill profile.
 */
export async function getSkillEvidence(
  studentId: string,
  skillProfileId: string
): Promise<SkillEvidence[]> {
  const q = query(
    collection(db, STUDENTS, studentId, SKILL_PROFILES, skillProfileId, EVIDENCE),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SkillEvidence));
}

/**
 * Update student readiness score.
 */
export async function updateStudentReadiness(
  studentId: string,
  readinessScore: number
): Promise<void> {
  await updateDoc(doc(db, STUDENTS, studentId), {
    readinessScore,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get students by institution for dashboards.
 */
export async function getStudentsByInstitution(institutionId: string): Promise<Student[]> {
  const q = query(
    collection(db, STUDENTS),
    where('institutionId', '==', institutionId),
    orderBy('readinessScore', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
}
