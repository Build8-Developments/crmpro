/** Longest range GET /source-spend returns. */
export const MAX_SPEND_MONTHS = 12;

/** Months shown when no range is given (the current one and 5 before). */
export const DEFAULT_SPEND_MONTHS = 6;

export const MAX_SPEND_ENTRIES = 500;

/** Upper bound that still fits Decimal(14, 2). */
export const MAX_SPEND_AMOUNT = 999_999_999_999;

export const MAX_SPEND_NOTE_LENGTH = 300;

export const SPEND_AUDIT_ACTIONS = {
  UPDATED: 'SOURCE_SPEND_UPDATED',
} as const;

export const SPEND_AUDIT_ENTITY = 'SourceSpend';
