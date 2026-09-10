/**
 * Opportunity service — CRUD and querying opportunities from Firestore.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, query,
  where, orderBy, limit as firestoreLimit, serverTimestamp, startAfter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Opportunity, OpportunityType, OpportunityStatus } from '@shared/types';

const OPPORTUNITIES = 'opportunities';

export interface OpportunityFilters {
  type?: OpportunityType;
  status?: OpportunityStatus;
  organizationId?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Get opportunities with optional filters.
 */
export async function getOpportunities(filters: OpportunityFilters = {}): Promise<Opportunity[]> {
  const constraints: any[] = [];

  if (filters.status) {
    constraints.push(where('status', '==', filters.status));
  } else {
    constraints.push(where('status', '==', 'active'));
  }

  if (filters.type) {
    constraints.push(where('type', '==', filters.type));
  }

  if (filters.organizationId) {
    constraints.push(where('organizationId', '==', filters.organizationId));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(firestoreLimit(filters.limit || 20));

  const q = query(collection(db, OPPORTUNITIES), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Opportunity));
}

/**
 * Get a single opportunity by ID.
 */
export async function getOpportunityById(opportunityId: string): Promise<Opportunity | null> {
  const docSnap = await getDoc(doc(db, OPPORTUNITIES, opportunityId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Opportunity;
}

/**
 * Create a new opportunity (industry/institution users).
 */
export async function createOpportunity(
  data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt' | 'applicationCount'>
): Promise<string> {
  const docRef = await addDoc(collection(db, OPPORTUNITIES), {
    ...data,
    applicationCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing opportunity.
 */
export async function updateOpportunity(
  opportunityId: string,
  data: Partial<Opportunity>
): Promise<void> {
  await updateDoc(doc(db, OPPORTUNITIES, opportunityId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
