/**
 * Public directory of institutions and organizations.
 *
 * Onboarding needs these *before* the user has an account, so these are the only two
 * unauthenticated data routes in the application. They expose nothing beyond what a
 * signup form must show: an id, a name and the departments to choose from. Metrics,
 * admin lists and every other field stay server-side.
 */
import type { RequestHandler } from 'express';
import { adminDb } from '../lib/firebase-admin';

export interface DirectoryInstitution {
  id: string;
  name: string;
  location: string;
  departments: string[];
}

export interface DirectoryOrganization {
  id: string;
  name: string;
  domain: string;
}

export const handleListInstitutions: RequestHandler = async (_req, res) => {
  try {
    const snapshot = await adminDb.collection('institutions').orderBy('name').limit(200).get();
    const institutions: DirectoryInstitution[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        location: data.location || '',
        departments: Array.isArray(data.departments) ? data.departments : [],
      };
    });
    res.json({ institutions });
  } catch (error) {
    console.error('[Directory] listInstitutions failed:', error);
    res.status(500).json({ error: 'Could not load institutions' });
  }
};

export const handleListOrganizations: RequestHandler = async (_req, res) => {
  try {
    const snapshot = await adminDb.collection('organizations').orderBy('name').limit(200).get();
    const organizations: DirectoryOrganization[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { id: doc.id, name: data.name || '', domain: data.domain || '' };
    });
    res.json({ organizations });
  } catch (error) {
    console.error('[Directory] listOrganizations failed:', error);
    res.status(500).json({ error: 'Could not load organizations' });
  }
};
