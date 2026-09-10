/**
 * Faculty service — faculty profiles and industry passport data.
 */
import {
  collection, doc, getDoc, getDocs, query, where, orderBy,
  updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Faculty, FacultyRecommendation } from '@shared/types';

const FACULTY = 'faculty';

/**
 * Get faculty profile by user ID.
 */
export async function getFacultyByUserId(userId: string): Promise<Faculty | null> {
  const q = query(collection(db, FACULTY), where('userId', '==', userId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Faculty;
}

/**
 * Get faculty by institution.
 */
export async function getFacultyByInstitution(institutionId: string): Promise<Faculty[]> {
  const q = query(
    collection(db, FACULTY),
    where('institutionId', '==', institutionId),
    orderBy('industryExposure', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Faculty));
}

/** Update the authenticated faculty member's professional passport. */
export async function updateFacultyProfile(facultyId: string, data: Partial<Pick<Faculty, 'department' | 'designation' | 'specializations'>>): Promise<void> {
  await updateDoc(doc(db, FACULTY, facultyId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Generate recommended next steps for faculty industry passport.
 * Deterministic recommendations based on current metrics.
 */
export function getFacultyRecommendations(faculty: Faculty): FacultyRecommendation[] {
  const recommendations: FacultyRecommendation[] = [];

  if (faculty.metrics.industryProjects < 5) {
    recommendations.push({
      title: 'Industry immersion',
      description: '2-week applied program with an industry partner',
      impact: '+12 exposure',
      type: 'immersion',
    });
  }

  if (faculty.metrics.mentoredStudents < 20) {
    recommendations.push({
      title: 'Mentor a live project',
      description: 'Guide a student team through a real-world deployment',
      impact: '+8 exposure',
      type: 'mentoring',
    });
  }

  if (faculty.metrics.fdpCompleted < 3) {
    recommendations.push({
      title: 'Apply for FDP',
      description: 'Production ML systems · faculty development program',
      impact: '+10 exposure',
      type: 'fdp',
      deadline: '9 days',
    });
  }

  if (faculty.metrics.consultancies < 2) {
    recommendations.push({
      title: 'Industry consultancy',
      description: 'Contribute domain expertise to an industry R&D project',
      impact: '+15 exposure',
      type: 'consultancy',
    });
  }

  return recommendations.slice(0, 3);
}
