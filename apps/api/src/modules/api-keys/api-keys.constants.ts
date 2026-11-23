/** Every key starts with this, so leaked keys are easy to recognise and scan for. */
export const API_KEY_PREFIX = 'crm_live_';

/** 32 random bytes → 43 base64url characters after the prefix. */
export const API_KEY_RANDOM_BYTES = 32;

/** Stored in clear so people can tell their keys apart (e.g. `crm_live_Ab3x`). */
export const API_KEY_DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 4;

/** Longer input is not one of our keys; reject it before hashing. */
export const API_KEY_MAX_LENGTH = 200;

/** Active (non-revoked) keys a workspace may hold at once. */
export const MAX_ACTIVE_API_KEYS_PER_TENANT = 20;

export const API_KEY_AUDIT_ACTIONS = {
  CREATED: 'API_KEY_CREATED',
  REVOKED: 'API_KEY_REVOKED',
} as const;

export const API_KEY_AUDIT_ENTITY = 'ApiKey';
