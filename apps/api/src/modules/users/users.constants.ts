export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export const USER_AUDIT_ACTIONS = {
  CREATED: 'USER_CREATED',
  UPDATED: 'USER_UPDATED',
  ROLE_CHANGED: 'USER_ROLE_CHANGED',
  DEACTIVATED: 'USER_DEACTIVATED',
  REACTIVATED: 'USER_REACTIVATED',
  PASSWORD_RESET: 'USER_PASSWORD_RESET',
  SESSIONS_REVOKED: 'USER_SESSIONS_REVOKED',
  INVITED: 'USER_INVITED',
  INVITE_RESENT: 'USER_INVITE_RESENT',
  INVITE_ACCEPTED: 'USER_INVITE_ACCEPTED',
  PASSWORD_RESET_SELF: 'USER_PASSWORD_RESET_SELF',
} as const;

/** Lifetimes of emailed links. */
export const PASSWORD_RESET_TTL_MINUTES = 30;
export const INVITE_TTL_DAYS = 7;
/** Repeated "forgot password" requests for one user within this window are ignored. */
export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;
/** An invitation can be re-sent at most once per this window. */
export const INVITE_RESEND_COOLDOWN_MS = 2 * 60 * 1000;
