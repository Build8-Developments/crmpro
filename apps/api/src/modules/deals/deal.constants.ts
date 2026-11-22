export const DEAL_AUDIT_ENTITY_TYPE = 'Deal';

export const DEAL_AUDIT_ACTIONS = {
  RESERVED: 'DEAL_RESERVED',
  UPDATED: 'DEAL_UPDATED',
  CONTRACTED: 'DEAL_CONTRACTED',
  CANCELLED: 'DEAL_CANCELLED',
} as const;

/** Clock skew allowed when a date "must not be in the future". */
export const DEAL_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
