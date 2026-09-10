/**
 * Document types.
 * Metadata stored in `documents/{id}`.
 * Actual files stored in Firebase Storage.
 */
import type { BaseEntity, VerificationStatus } from './common';

export type DocumentType =
  | 'resume'
  | 'certificate'
  | 'project_report'
  | 'internship_letter'
  | 'academic_transcript'
  | 'recommendation'
  | 'mentor_validation'
  | 'assessment_result'
  | 'other';

export interface Document extends BaseEntity {
  userId: string;
  type: DocumentType;
  title: string;
  description?: string;

  /** Firebase Storage path. */
  storageRef: string;

  /** Public download URL (if permitted). */
  downloadURL?: string;

  /** File metadata. */
  fileName: string;
  fileSize: number;
  mimeType: string;

  /** Verification status. */
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: BaseEntity['createdAt'];

  /** Access control. */
  permissions: DocumentPermissions;
}

export interface DocumentPermissions {
  /** Is this document visible to recruiters/industry? */
  publicToIndustry: boolean;
  /** Is this document visible to the institution? */
  publicToInstitution: boolean;
  /** Specific user IDs that have access. */
  sharedWith?: string[];
}
