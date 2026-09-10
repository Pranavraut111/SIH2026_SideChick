/**
 * Notification types.
 * Stored in `notifications/{id}`.
 */
import type { BaseEntity } from './common';

export type NotificationType =
  | 'application_status_changed'
  | 'new_matching_opportunity'
  | 'mentor_feedback'
  | 'assessment_completed'
  | 'skill_verified'
  | 'internship_milestone'
  | 'deadline_approaching'
  | 'new_industry_mission'
  | 'institution_announcement'
  | 'system';

export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;

  /** Whether the user has read this notification. */
  read: boolean;

  /** Optional link to navigate to when clicked. */
  actionUrl?: string;

  /** Additional metadata for rendering. */
  metadata?: Record<string, unknown>;
}
