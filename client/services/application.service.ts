/**
 * Application service — manages student applications to opportunities.
 */
import {
  collection, doc, getDocs, updateDoc, query,
  where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Application, ApplicationStatus, MatchResult } from '@shared/types';

const APPLICATIONS = 'applications';

/**
 * Get all applications for a student.
 */
export async function getStudentApplications(studentId: string): Promise<Application[]> {
  const q = query(
    collection(db, APPLICATIONS),
    where('studentId', '==', studentId),
    orderBy('appliedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Application));
}

/**
 * Get all applications for an opportunity (for industry/institution).
 */
export async function getOpportunityApplications(opportunityId: string): Promise<Application[]> {
  const q = query(
    collection(db, APPLICATIONS),
    where('opportunityId', '==', opportunityId),
    orderBy('appliedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Application));
}

/** Get applications across an organization's opportunities for its pipeline. */
export async function getOrganizationApplications(organizationId: string): Promise<Application[]> {
  const q = query(
    collection(db, APPLICATIONS),
    where('organizationId', '==', organizationId),
    orderBy('appliedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Application));
}

/**
 * Submit an application.
 *
 * The browser sends only *which* opportunity — the server recomputes the match score,
 * the component breakdown and the eligibility verdict from Firestore before storing
 * them. Previously the client passed its own `matchScore`, which meant a student could
 * apply with a fabricated 100% match that recruiters would then shortlist on.
 *
 * @returns The new application id and the authoritative match the server recorded.
 */
export async function submitApplication(
  studentId: string,
  opportunityId: string
): Promise<{ applicationId: string; match: MatchResult }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to apply.');

  const response = await fetch('/api/applications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ studentId, opportunityId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Could not submit your application.');
  return { applicationId: data.applicationId, match: data.match };
}

/**
 * Update application status (for reviewers).
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus,
  reviewerNotes?: string
): Promise<void> {
  const updates: Record<string, any> = {
    status,
    updatedAt: serverTimestamp(),
  };

  // Set lifecycle timestamps
  const timestampField = {
    under_review: 'reviewedAt',
    shortlisted: 'shortlistedAt',
    interview: 'interviewAt',
    selected: 'decidedAt',
    rejected: 'decidedAt',
  }[status];

  if (timestampField) {
    updates[timestampField] = serverTimestamp();
  }

  if (reviewerNotes) {
    updates.reviewerNotes = reviewerNotes;
  }

  await updateDoc(doc(db, APPLICATIONS, applicationId), updates);
}

/**
 * Withdraw an application (student action).
 */
export async function withdrawApplication(applicationId: string): Promise<void> {
  await updateDoc(doc(db, APPLICATIONS, applicationId), {
    status: 'withdrawn' as ApplicationStatus,
    updatedAt: serverTimestamp(),
  });
}
