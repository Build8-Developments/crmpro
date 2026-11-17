import { LeadActivityEventType, TaskType } from '@crmpro/database';

/** Notify assignees this long before a follow-up is due. */
export const TASK_DUE_SOON_MINUTES = 15;
/** Overdue notices are only sent for tasks that went overdue recently. */
export const TASK_OVERDUE_LOOKBACK_HOURS = 48;
export const TASK_REMINDER_SCAN_INTERVAL_MS = 60 * 1000;
export const TASK_REMINDER_BATCH_SIZE = 200;
export const TASK_REMINDER_JOB_NAME = 'task-reminders';

export const TASK_SORT_FIELDS = ['dueAt', 'createdAt', 'updatedAt'] as const;

export const INTERACTION_TYPES = [
  'CALL',
  'WHATSAPP',
  'EMAIL',
  'MEETING',
  'SITE_VISIT',
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const INTERACTION_OUTCOMES = [
  'ANSWERED',
  'NO_ANSWER',
  'BUSY',
  'WRONG_NUMBER',
  'INTERESTED',
  'NOT_INTERESTED',
  'CALLBACK_REQUESTED',
  'OTHER',
] as const;
export type InteractionOutcome = (typeof INTERACTION_OUTCOMES)[number];

export const INTERACTION_EVENT_TYPES: Record<
  InteractionType,
  LeadActivityEventType
> = {
  CALL: LeadActivityEventType.CALL_LOGGED,
  WHATSAPP: LeadActivityEventType.WHATSAPP_LOGGED,
  EMAIL: LeadActivityEventType.EMAIL_LOGGED,
  MEETING: LeadActivityEventType.MEETING_LOGGED,
  SITE_VISIT: LeadActivityEventType.SITE_VISIT_LOGGED,
};

export const DEFAULT_TASK_TITLES: Record<TaskType, string> = {
  CALL: 'Call back',
  WHATSAPP: 'WhatsApp follow-up',
  MEETING: 'Meeting',
  SITE_VISIT: 'Site visit',
  EMAIL: 'Send email',
  FOLLOW_UP: 'Follow up',
  OTHER: 'To-do',
};
