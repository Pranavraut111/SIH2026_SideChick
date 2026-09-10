/**
 * Profile bootstrap.
 *
 * POST /api/auth/setup-profile
 *
 * Runs once per account, immediately after Firebase Auth account creation. It sets the
 * custom claims that `firestore.rules` authorizes on, so it is the single most
 * security-sensitive route in the application:
 *
 *  - the caller must prove ownership of `uid` with a valid ID token;
 *  - `institutionId` / `organizationId` are requests, not facts — each is checked
 *    against the real Firestore document before it is written into a claim;
 *  - `department` must be one the institution actually offers.
 *
 * Without those checks a user could claim membership of any institution or company and
 * inherit read/write access to its data through `belongsToInstitution` /
 * `belongsToOrganization`.
 */
import type { RequestHandler } from 'express';
import { adminAuth, adminDb, FieldValue } from '../lib/firebase-admin';
import { authedUser } from '../middleware/auth';
import { setupProfileSchema } from '../../shared/schemas';
import type { UserRole } from '../../shared/types';

/** Where each role's profile document lives. */
const PROFILE_COLLECTION: Record<UserRole, string> = {
  student: 'students',
  faculty: 'faculty',
  industry: 'industryUsers',
  institution: 'institutionAdmins',
};

export const handleSetupProfile: RequestHandler = async (req, res) => {
  const caller = authedUser(req);

  const parsed = setupProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Some details are missing or invalid',
      issues: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  const { uid, role, displayName, institutionId, organizationId, details } = parsed.data;

  if (caller.uid !== uid) {
    res.status(403).json({ error: 'You can only create your own profile' });
    return;
  }

  try {
    // --- Verify the tenancy the client is asking to join actually exists ---
    let institution: FirebaseFirestore.DocumentSnapshot | undefined;
    if (institutionId) {
      institution = await adminDb.collection('institutions').doc(institutionId).get();
      if (!institution.exists) {
        res.status(400).json({ error: 'The selected institution does not exist' });
        return;
      }
    }

    if (organizationId) {
      const organization = await adminDb.collection('organizations').doc(organizationId).get();
      if (!organization.exists) {
        res.status(400).json({ error: 'The selected organization does not exist' });
        return;
      }
    }

    // Departments are constrained to the institution's own list so cohort analytics,
    // which group by department, cannot be polluted by free text.
    const department = details?.department?.trim();
    if (department && institution) {
      const departments: string[] = institution.data()?.departments || [];
      if (departments.length && !departments.includes(department)) {
        res.status(400).json({ error: 'That department is not offered by the selected institution' });
        return;
      }
    }

    // --- Reject a second profile for the same account before writing anything ---
    const userRef = adminDb.collection('users').doc(uid);
    if ((await userRef.get()).exists) {
      res.status(409).json({ error: 'A profile already exists for this account' });
      return;
    }

    const authUser = await adminAuth.getUser(uid);
    const email = authUser.email || '';
    const now = FieldValue.serverTimestamp();
    const profileRef = adminDb.collection(PROFILE_COLLECTION[role]).doc();

    // --- Write user doc and role profile atomically ---
    const batch = adminDb.batch();

    batch.create(userRef, {
      uid,
      email,
      displayName,
      role,
      institutionId: institutionId || null,
      organizationId: organizationId || null,
      profileRef: `${PROFILE_COLLECTION[role]}/${profileRef.id}`,
      onboardingComplete: true,
      createdAt: now,
      updatedAt: now,
    });

    const common = { userId: uid, displayName, email, createdAt: now, updatedAt: now };

    switch (role) {
      case 'student':
        batch.set(profileRef, {
          ...common,
          institutionId,
          department,
          batch: details?.batch?.trim() || '',
          careerTarget: '',
          careerTargetId: '',
          readinessScore: 0,
          verifiedSkillCount: 0,
          matchedOpportunityCount: 0,
          metrics: {
            totalSkills: 0,
            verifiedSkills: 0,
            criticalGaps: 0,
            activeApplications: 0,
            completedMissions: 0,
            evidenceCount: 0,
          },
        });
        break;

      case 'faculty':
        batch.set(profileRef, {
          ...common,
          institutionId,
          department,
          designation: details?.designation?.trim() || '',
          specializations: [],
          industryExposure: 0,
          exposureChange: '',
          metrics: {
            industryProjects: 0,
            mentoredStudents: 0,
            researchLinks: 0,
            fdpCompleted: 0,
            guestLectures: 0,
            consultancies: 0,
          },
        });
        break;

      case 'industry':
        batch.set(profileRef, {
          ...common,
          organizationId,
          jobTitle: details?.jobTitle?.trim() || '',
        });
        break;

      case 'institution':
        batch.set(profileRef, { ...common, institutionId });
        break;
    }

    await batch.commit();

    // Claims last: if anything above failed, the account gains no privileges.
    const claims: Record<string, string> = { role };
    if (institutionId) claims.institutionId = institutionId;
    if (organizationId) claims.organizationId = organizationId;
    await adminAuth.setCustomUserClaims(uid, claims);

    res.json({ success: true, profileId: profileRef.id });
  } catch (error) {
    console.error('[Auth] setup-profile failed:', error);
    res.status(500).json({ error: 'Could not complete profile setup' });
  }
};
