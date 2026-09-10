/**
 * Application submission.
 *
 * POST /api/applications — apply to an opportunity
 *
 * The client sends only *which* opportunity it is applying to. Everything a recruiter
 * later sorts and filters on — the match score, the component breakdown, the matched and
 * missing skills, the eligibility verdict — is recomputed here from Firestore so it
 * cannot be authored by the applicant.
 */
import type { RequestHandler } from 'express';
import { adminDb, FieldValue } from '../lib/firebase-admin';
import { authedUser } from '../middleware/auth';
import { submitApplicationSchema } from '../../shared/schemas';
import { calculateMatch } from '../../shared/engine';
import { loadOwnedStudent } from './matching';
import type { MatchDetails, Opportunity } from '../../shared/types';

export const handleSubmitApplication: RequestHandler = async (req, res) => {
  const parsed = submitApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'studentId and opportunityId are required' });
    return;
  }

  const { studentId, opportunityId } = parsed.data;

  try {
    const owned = await loadOwnedStudent(studentId, authedUser(req).uid, res);
    if (!owned) return;

    const opportunitySnapshot = await adminDb.collection('opportunities').doc(opportunityId).get();
    if (!opportunitySnapshot.exists) {
      res.status(404).json({ error: 'That opportunity no longer exists' });
      return;
    }

    const opportunity = {
      id: opportunitySnapshot.id,
      ...opportunitySnapshot.data(),
    } as Opportunity;

    if (opportunity.status !== 'active') {
      res.status(409).json({ error: 'That opportunity is no longer accepting applications' });
      return;
    }

    if (opportunity.deadline && opportunity.deadline.toMillis() < Date.now()) {
      res.status(409).json({ error: 'The application deadline for this opportunity has passed' });
      return;
    }

    // One application per student per opportunity.
    const existing = await adminDb
      .collection('applications')
      .where('studentId', '==', studentId)
      .where('opportunityId', '==', opportunityId)
      .limit(1)
      .get();
    if (!existing.empty) {
      res.status(409).json({ error: 'You have already applied to this opportunity' });
      return;
    }

    const match = calculateMatch(owned.student, owned.skillProfiles, opportunity);

    if (match.eligibilityStatus === 'ineligible') {
      res.status(403).json({
        error: 'You do not meet the eligibility criteria for this opportunity',
        reasons: match.reasons,
      });
      return;
    }

    const matchDetails: MatchDetails = {
      skillCompatibility: match.components.skillCompatibility,
      evidenceQuality: match.components.evidenceQuality,
      eligibilityScore: match.components.eligibility,
      projectRelevance: match.components.projectRelevance,
      experienceScore: match.components.experience,
      careerPreference: match.components.careerPreference,
      locationPreference: match.components.locationPreference,
      matchedSkills: match.matchedSkills.filter((s) => s.meets).map((s) => s.skillName),
      missingSkills: match.missingSkills.map((s) => s.skillName),
      eligibilityStatus: match.eligibilityStatus,
      reasons: match.reasons,
    };

    const now = FieldValue.serverTimestamp();
    const applicationRef = adminDb.collection('applications').doc();

    const batch = adminDb.batch();
    batch.create(applicationRef, {
      studentId,
      studentName: owned.student.displayName,
      // Denormalized so recruiters can filter their pipeline without a join, and so the
      // institution funnel can aggregate without reading every opportunity.
      institutionId: owned.student.institutionId || null,
      opportunityId,
      opportunityTitle: opportunity.title,
      organizationId: opportunity.organizationId,
      status: 'applied',
      matchScore: match.matchScore,
      matchDetails,
      appliedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    batch.update(opportunitySnapshot.ref, {
      applicationCount: FieldValue.increment(1),
      updatedAt: now,
    });
    batch.update(adminDb.collection('students').doc(studentId), {
      'metrics.activeApplications': FieldValue.increment(1),
      updatedAt: now,
    });

    await batch.commit();

    res.status(201).json({ success: true, applicationId: applicationRef.id, match });
  } catch (error) {
    console.error('[Applications] submit failed:', error);
    res.status(500).json({ error: 'Could not submit your application' });
  }
};
