/**
 * Skill domain types.
 * Master skills in `skills/{id}`.
 * Student skill profiles as subcollection `students/{id}/skillProfiles/{skillId}`.
 * Skill evidence as subcollection `students/{id}/skillProfiles/{skillId}/evidence/{evidenceId}`.
 */
import type { BaseEntity, VerificationStatus, DifficultyLevel } from './common';
import type { Timestamp } from 'firebase/firestore';

/** Master skill definition in the `skills` collection. */
export interface Skill extends BaseEntity {
  name: string;
  category: string;
  categoryId: string;
  description?: string;
  aliases?: string[];
  /** Icon key for UI rendering. */
  icon?: string;
}

/** Skill category for grouping. */
export interface SkillCategory extends BaseEntity {
  name: string;
  domain: string;
  description?: string;
  displayOrder: number;
}

/** A student's proficiency in a specific skill. */
export interface SkillProfile extends BaseEntity {
  skillId: string;
  skillName: string;   // denormalized
  category: string;    // denormalized

  /** Current proficiency level (0-100). */
  proficiency: number;

  /** Required proficiency for the student's career target (0-100). */
  requiredLevel: number;

  /** Confidence score based on evidence recency and quality (0-100). */
  confidence: number;

  /** Number of evidence items supporting this skill. */
  evidenceCount: number;

  /** Last time this skill was verified or assessed. */
  lastVerified?: Timestamp;

  /** Current status of this skill. */
  status: SkillStatus;

  /** How this skill was most recently sourced/updated. */
  source: SkillSource;

  /** Time since last verification for UI display. */
  recency: string;
}

export type SkillStatus =
  | 'verified'
  | 'in_progress'
  | 'critical_gap'
  | 'not_started'
  | 'expired';

export type SkillSource =
  | 'assessment'
  | 'project'
  | 'certification'
  | 'course'
  | 'mentor_verification'
  | 'internship'
  | 'industry_mission'
  | 'self_declared';

/** Evidence supporting a skill proficiency claim. */
export interface SkillEvidence extends BaseEntity {
  skillProfileId: string;
  type: EvidenceType;
  title: string;
  description?: string;

  /** Source of the evidence (e.g., course name, project title). */
  source: string;

  /** Score achieved (if applicable, 0-100). */
  score?: number;

  /** Verification status. */
  verificationStatus: VerificationStatus;

  /** Who verified this evidence. */
  verifiedBy?: string;
  verifiedAt?: Timestamp;

  /** Reference to a document in Firebase Storage. */
  documentRef?: string;

  /** External URL if evidence is hosted elsewhere. */
  externalUrl?: string;
}

export type EvidenceType =
  | 'assessment_result'
  | 'project_submission'
  | 'certificate'
  | 'course_completion'
  | 'mentor_validation'
  | 'internship_report'
  | 'industry_mission'
  | 'peer_review';

/** Skill gap analysis result for a student against a target role. */
export interface SkillGap {
  skillId: string;
  skillName: string;
  category: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  severity: GapSeverity;
  reason: string;
  recommendedIntervention: string;
}

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low' | 'none';
