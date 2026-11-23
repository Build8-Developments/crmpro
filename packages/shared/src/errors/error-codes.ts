export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  /** A password-protected Files folder that this session has not unlocked. */
  FOLDER_LOCKED: 'FOLDER_LOCKED',
  /** Logging an interaction on an open lead must schedule the next step. */
  NEXT_STEP_REQUIRED: 'NEXT_STEP_REQUIRED',
  /** Moving a lead to a Lost stage needs a lost reason. */
  LOST_REASON_REQUIRED: 'LOST_REASON_REQUIRED',
  /** Moving a task later needs a reason (snoozes are counted). */
  SNOOZE_REASON_REQUIRED: 'SNOOZE_REASON_REQUIRED',
  /** Moving a lead to a Won stage needs the deal details. */
  DEAL_REQUIRED: 'DEAL_REQUIRED',
  /** The lead has a live deal; cancel it before moving the lead out of Won. */
  DEAL_ACTIVE: 'DEAL_ACTIVE',
  /** The contract was terminated in read-only mode: no changes until access ends. */
  TENANT_READ_ONLY: 'TENANT_READ_ONLY',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
