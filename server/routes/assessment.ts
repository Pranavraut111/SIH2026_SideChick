/**
 * Assessment.
 *
 * POST /api/assessment/generate — AI-authored questions for a target role
 * POST /api/assessment/evaluate — score answers and write the student's Skill DNA
 *
 * The division of labour between AI and deterministic code is deliberate:
 *
 *   AI decides   → the questions, and how good an individual answer is (`proficiency`)
 *   Code decides → the skill's status, the required level, the readiness score, and
 *                  whether any of it is well-formed enough to persist at all
 *
 * Model output is untrusted input. It is schema-validated and clamped before it is
 * allowed to become permanent domain state, and `status` is re-derived from the
 * proficiency score rather than taken from the model — otherwise a model could label a
 * 20% skill "verified" and that label would follow the student into recruiter searches.
 */
import type { RequestHandler } from 'express';
import { generateJSON } from '../services/ai.service';
import { adminDb, FieldValue } from '../lib/firebase-admin';
import { authedUser } from '../middleware/auth';
import {
  assessmentQuestionsSchema,
  evaluateAssessmentSchema,
  generateAssessmentSchema,
  skillEvaluationsSchema,
} from '../../shared/schemas';
import { computeRoleReadiness, deriveSkillStatus } from '../../shared/engine';
import type { RoleSkillRequirement } from '../../shared/types';

/** Read a role and confirm the title the client displayed still matches the record. */
async function loadRole(roleId: string, careerTarget: string) {
  const snapshot = await adminDb.collection('roles').doc(roleId).get();
  if (!snapshot.exists || snapshot.data()?.title !== careerTarget) return null;
  return snapshot;
}

// ============================================
// POST /api/assessment/generate
// ============================================

export const handleGenerateAssessment: RequestHandler = async (req, res) => {
  const parsed = generateAssessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'roleId and careerTarget are required' });
    return;
  }

  const { roleId, careerTarget } = parsed.data;

  try {
    const role = await loadRole(roleId, careerTarget);
    if (!role) {
      res.status(400).json({ error: 'The selected career role is invalid' });
      return;
    }

    // Skills come from the role record, never from the request body — otherwise a caller
    // could steer the assessment toward skills the role does not actually require.
    const requirements: RoleSkillRequirement[] = role.data()?.requiredSkills || [];
    const skills = requirements.map((r) => r.skillName).filter(Boolean);
    if (!skills.length) {
      res.status(400).json({ error: 'The selected role has no assessable skills' });
      return;
    }

    const questionCount = Math.min(skills.length * 2, 10);

    const prompt = `You are a technical skill assessment engine for an academia-industry collaboration platform.

Generate exactly ${questionCount} assessment questions to evaluate a student targeting the "${careerTarget}" career path.

Cover these skills: ${skills.join(', ')}

Requirements:
- Mix difficulty levels (beginner, intermediate, advanced)
- Questions should test real practical knowledge, not just definitions
- Each question should be answerable in 2-4 sentences
- Cover at least one question per skill
- "skillName" MUST be one of exactly these values: ${skills.join(', ')}

Return a JSON array with this exact schema:
[
  {
    "id": 1,
    "skillName": "Python",
    "question": "Explain the difference between a list and a tuple. When would you use each?",
    "difficulty": "beginner",
    "expectedConcepts": ["mutability", "performance", "use cases"]
  }
]

Return ONLY the JSON array, no other text.`;

    const raw = await generateJSON(prompt);
    const validated = assessmentQuestionsSchema.safeParse(raw);
    if (!validated.success) {
      console.error('[Assessment] Model returned malformed questions:', validated.error.issues);
      res.status(502).json({ error: 'The assessment service returned an unusable response. Please try again.' });
      return;
    }

    res.json({ questions: validated.data });
  } catch (error) {
    console.error('[Assessment] Generate failed:', error);
    res.status(502).json({ error: 'Could not generate your assessment. Please try again.' });
  }
};

// ============================================
// POST /api/assessment/evaluate
// ============================================

export const handleEvaluateAssessment: RequestHandler = async (req, res) => {
  const parsed = evaluateAssessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Some assessment details are missing or invalid',
      issues: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  const { studentId, roleId, careerTarget, answers } = parsed.data;

  try {
    const studentRef = adminDb.collection('students').doc(studentId);
    const studentSnapshot = await studentRef.get();
    if (!studentSnapshot.exists) {
      res.status(404).json({ error: 'Student profile not found' });
      return;
    }
    if (studentSnapshot.data()?.userId !== authedUser(req).uid) {
      res.status(403).json({ error: 'You can only assess your own profile' });
      return;
    }

    const role = await loadRole(roleId, careerTarget);
    if (!role) {
      res.status(400).json({ error: 'The selected career role is invalid' });
      return;
    }
    const requirements: RoleSkillRequirement[] = role.data()?.requiredSkills || [];

    const answersBlock = answers
      .map((a, i) => `Q${i + 1} [${a.skillName} / ${a.difficulty}]: ${a.question}\nStudent Answer: ${a.answer}`)
      .join('\n\n');

    const prompt = `You are a skill evaluator for an academia-industry collaboration platform.

The student is targeting "${careerTarget}".

Here are their assessment answers:

${answersBlock}

Evaluate each skill and return a JSON array with this exact schema:
[
  {
    "skillName": "Python",
    "category": "Programming",
    "proficiency": 65,
    "confidence": 70,
    "gaps": ["Error handling", "OOP patterns"],
    "strengths": ["Basic syntax", "Data structures"]
  }
]

Scoring rules:
- proficiency: 0-100 based on answer quality. Be honest and fair. 0 for no answer, 20 for wrong answers, 40-60 for partial, 70-85 for good, 85-100 for excellent
- confidence: how confident you are in this score (50-100)
- Group by unique skillName, averaging scores for skills with multiple questions

Return ONLY the JSON array, no other text.`;

    const raw = await generateJSON(prompt);
    const validated = skillEvaluationsSchema.safeParse(raw);
    if (!validated.success) {
      console.error('[Assessment] Model returned malformed evaluation:', validated.error.issues);
      res.status(502).json({ error: 'The evaluation service returned an unusable response. Please try again.' });
      return;
    }
    const evaluations = validated.data;

    // Only skills the assessment actually covered may be written, so a model that
    // invents an extra skill cannot inject it into the student's Skill DNA.
    const assessedSkillNames = new Set(answers.map((a) => a.skillName.toLowerCase()));
    const accepted = evaluations.filter((e) => assessedSkillNames.has(e.skillName.toLowerCase()));
    if (!accepted.length) {
      res.status(502).json({ error: 'The evaluation did not cover any of the assessed skills. Please try again.' });
      return;
    }

    const now = FieldValue.serverTimestamp();
    const batch = adminDb.batch();
    const skillProfilesRef = studentRef.collection('skillProfiles');

    // Existing profiles tell us whether a doc is new (so `createdAt` is not overwritten
    // on reassessment) and give us the levels for skills this assessment did not cover.
    const existingSnapshot = await skillProfilesRef.get();
    const existing = new Map(existingSnapshot.docs.map((d) => [d.id, d.data()]));

    const writtenLevels = new Map<string, number>();

    for (const evaluation of accepted) {
      const requirement = requirements.find(
        (r) => r.skillName?.toLowerCase() === evaluation.skillName.toLowerCase()
      );
      const profileId =
        requirement?.skillId || evaluation.skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const skillRef = skillProfilesRef.doc(profileId);
      const previous = existing.get(profileId);

      // Status is derived, never taken from the model.
      const status = deriveSkillStatus(evaluation.proficiency, true);

      batch.set(
        skillRef,
        {
          skillId: profileId,
          skillName: evaluation.skillName,
          category: evaluation.category,
          proficiency: evaluation.proficiency,
          requiredLevel: requirement?.minimumLevel ?? 75,
          confidence: evaluation.confidence,
          evidenceCount: FieldValue.increment(1),
          status,
          source: 'assessment',
          recency: 'Today',
          lastVerified: now,
          updatedAt: now,
          ...(previous ? {} : { createdAt: now }),
        },
        { merge: true }
      );

      batch.set(skillRef.collection('evidence').doc(), {
        skillProfileId: profileId,
        type: 'assessment_result',
        title: `${careerTarget} assessment`,
        description: evaluation.strengths.length
          ? `Strengths: ${evaluation.strengths.join(', ')}`
          : undefined,
        source: 'ShikshaSetu assessment',
        score: evaluation.proficiency,
        verificationStatus: 'verified',
        verifiedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      writtenLevels.set(profileId, evaluation.proficiency);
    }

    // Readiness spans *every* skill the role requires, weighted — not just the ones this
    // assessment happened to cover. Skills with no evidence contribute zero.
    const levels = [
      ...existingSnapshot.docs
        .filter((d) => !writtenLevels.has(d.id))
        .map((d) => ({ skillId: d.data().skillId || d.id, proficiency: d.data().proficiency || 0 })),
      ...[...writtenLevels].map(([skillId, proficiency]) => ({ skillId, proficiency })),
    ];
    const readiness = computeRoleReadiness(levels, requirements);

    const verifiedCount = levels.filter((l) => deriveSkillStatus(l.proficiency, true) === 'verified').length;
    const criticalCount = levels.filter((l) => deriveSkillStatus(l.proficiency, true) === 'critical_gap').length;

    batch.update(studentRef, {
      readinessScore: readiness.score,
      careerTarget,
      careerTargetId: roleId,
      verifiedSkillCount: verifiedCount,
      'metrics.totalSkills': levels.length,
      'metrics.verifiedSkills': verifiedCount,
      'metrics.criticalGaps': criticalCount,
      'metrics.evidenceCount': FieldValue.increment(accepted.length),
      updatedAt: now,
    });

    await batch.commit();

    res.json({
      success: true,
      readinessScore: readiness.score,
      skills: accepted.map((evaluation) => ({
        ...evaluation,
        status: deriveSkillStatus(evaluation.proficiency, true),
      })),
      unmeasuredSkills: readiness.unmeasuredSkills,
    });
  } catch (error) {
    console.error('[Assessment] Evaluate failed:', error);
    res.status(500).json({ error: 'Could not evaluate your assessment' });
  }
};
