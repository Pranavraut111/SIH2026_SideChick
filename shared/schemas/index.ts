/**
 * Runtime validation schemas.
 *
 * Two distinct jobs, both mandatory before anything reaches Firestore:
 *
 *  1. **Request schemas** validate what clients send us.
 *  2. **AI output schemas** validate what a language model returns. Model output is
 *     untrusted input — it is parsed, clamped and re-derived before it is allowed to
 *     become permanent domain state.
 */
import { z } from 'zod';

// ============================================
// Primitives
// ============================================

/** A proficiency/confidence/coverage score. Always 0-100, always an integer. */
export const scoreSchema = z.number().finite().min(0).max(100).transform((n) => Math.round(n));

/** A Firestore document id supplied by a client. */
export const documentIdSchema = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(1500)
  .regex(/^[^/]+$/, 'Must not contain a path separator');

export const userRoleSchema = z.enum(['student', 'faculty', 'industry', 'institution']);

const nonEmptyString = (max: number) => z.string().trim().min(1).max(max);

// ============================================
// Requests
// ============================================

/**
 * Profile setup. `institutionId` / `organizationId` are *claims* the client is asking
 * for — the route verifies each one against Firestore before it becomes a custom claim.
 */
export const setupProfileSchema = z
  .object({
    uid: documentIdSchema,
    role: userRoleSchema,
    displayName: nonEmptyString(120),
    institutionId: documentIdSchema.optional(),
    organizationId: documentIdSchema.optional(),
    details: z
      .object({
        department: z.string().trim().max(120).optional(),
        batch: z.string().trim().max(20).optional(),
        designation: z.string().trim().max(120).optional(),
        jobTitle: z.string().trim().max(120).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    // Each role's tenancy anchor is mandatory, so no profile is ever created orphaned.
    if (value.role === 'industry' && !value.organizationId) {
      ctx.addIssue({ code: 'custom', path: ['organizationId'], message: 'Select your organization' });
    }
    if (value.role !== 'industry' && !value.institutionId) {
      ctx.addIssue({ code: 'custom', path: ['institutionId'], message: 'Select your institution' });
    }
    if (value.role === 'student' && !value.details?.department) {
      ctx.addIssue({ code: 'custom', path: ['details', 'department'], message: 'Select your department' });
    }
    if (value.role === 'student' && !value.details?.batch) {
      ctx.addIssue({ code: 'custom', path: ['details', 'batch'], message: 'Enter your graduating batch' });
    }
    if (value.role === 'faculty' && !value.details?.department) {
      ctx.addIssue({ code: 'custom', path: ['details', 'department'], message: 'Select your department' });
    }
  });

export const generateAssessmentSchema = z.object({
  roleId: documentIdSchema,
  careerTarget: nonEmptyString(160),
});

export const evaluateAssessmentSchema = z.object({
  studentId: documentIdSchema,
  roleId: documentIdSchema,
  careerTarget: nonEmptyString(160),
  answers: z
    .array(
      z.object({
        questionId: z.number().int().nonnegative(),
        skillName: nonEmptyString(120),
        question: nonEmptyString(2000),
        answer: z.string().max(5000),
        difficulty: z.string().max(40),
      })
    )
    .min(1, 'At least one answer is required')
    .max(40),
});

export const generateRoadmapSchema = z.object({
  studentId: documentIdSchema,
});

export const matchOpportunitiesSchema = z.object({
  studentId: documentIdSchema,
  /** Restrict scoring to specific opportunities; omit to score all active ones. */
  opportunityIds: z.array(documentIdSchema).max(100).optional(),
});

export const submitApplicationSchema = z.object({
  studentId: documentIdSchema,
  opportunityId: documentIdSchema,
});

// ============================================
// AI output
// ============================================

export const assessmentQuestionSchema = z.object({
  id: z.number().int(),
  skillName: nonEmptyString(120),
  question: nonEmptyString(2000),
  difficulty: z
    .string()
    .transform((value) => value.toLowerCase().trim())
    .pipe(z.enum(['beginner', 'intermediate', 'advanced']).catch('intermediate')),
  expectedConcepts: z.array(z.string().max(200)).max(20).default([]),
});

export const assessmentQuestionsSchema = z.array(assessmentQuestionSchema).min(1).max(40);

/**
 * A model's per-skill judgement.
 *
 * Note what is *absent*: `status`. The model is asked only for evidence of quality —
 * proficiency and its own confidence. Status is derived deterministically from the
 * proficiency score so a model cannot label a 20% skill "verified".
 */
export const skillEvaluationSchema = z.object({
  skillName: nonEmptyString(120),
  category: z.string().trim().max(120).default('General'),
  proficiency: scoreSchema,
  confidence: scoreSchema,
  gaps: z.array(z.string().max(200)).max(20).default([]),
  strengths: z.array(z.string().max(200)).max(20).default([]),
});

export const skillEvaluationsSchema = z.array(skillEvaluationSchema).min(1).max(40);

export type SetupProfileInput = z.infer<typeof setupProfileSchema>;
export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;
export type SkillEvaluation = z.infer<typeof skillEvaluationSchema>;
