/**
 * Roadmap service — reads roadmap data from Firestore for the React Flow visualization.
 */
import {
  collection, doc, getDoc, getDocs, query, where, orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Roadmap } from '@shared/types';

const STUDENTS = 'students';
const ROADMAPS = 'roadmaps';

/**
 * Get the active roadmap for a student.
 */
export async function getActiveRoadmap(studentId: string): Promise<Roadmap | null> {
  const q = query(
    collection(db, STUDENTS, studentId, ROADMAPS),
    where('status', '==', 'active'),
    firestoreLimit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Roadmap;
}

/**
 * Get all roadmaps for a student.
 */
export async function getStudentRoadmaps(studentId: string): Promise<Roadmap[]> {
  const q = query(
    collection(db, STUDENTS, studentId, ROADMAPS),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Roadmap));
}

/**
 * Get a specific roadmap by ID.
 */
export async function getRoadmapById(
  studentId: string,
  roadmapId: string
): Promise<Roadmap | null> {
  const docSnap = await getDoc(doc(db, STUDENTS, studentId, ROADMAPS, roadmapId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Roadmap;
}
