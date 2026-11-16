/** How long an unlocked private folder stays open for a session. */
export const FOLDER_UNLOCK_TTL_SECONDS = 30 * 60;

/** Wrong-password attempts allowed per user and folder per window. */
export const FOLDER_UNLOCK_MAX_ATTEMPTS = 5;
export const FOLDER_UNLOCK_WINDOW_SECONDS = 15 * 60;

export const FOLDER_NAME_MAX_LENGTH = 80;
export const FOLDER_MAX_DEPTH = 8;

export const FOLDER_AUDIT_ACTIONS = {
  CREATED: 'FOLDER_CREATED',
  UPDATED: 'FOLDER_UPDATED',
  DELETED: 'FOLDER_DELETED',
  PASSWORD_SET: 'FOLDER_PASSWORD_SET',
  PASSWORD_REMOVED: 'FOLDER_PASSWORD_REMOVED',
  PASSWORD_RESET: 'FOLDER_PASSWORD_RESET',
  UNLOCKED: 'FOLDER_UNLOCKED',
  UNLOCK_FAILED: 'FOLDER_UNLOCK_FAILED',
  FILES_MOVED: 'FILES_MOVED',
} as const;
