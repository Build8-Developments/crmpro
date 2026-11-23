/**
 * Client profile options shared by the API (validation, CSV import/export)
 * and the web (forms, filters, display).
 */

export const PAYMENT_PREFERENCES = ['CASH', 'INSTALLMENTS', 'MORTGAGE', 'FLEXIBLE'] as const;
export type PaymentPreference = (typeof PAYMENT_PREFERENCES)[number];

export const CONTACT_CHANNEL_PREFERENCES = ['CALL', 'WHATSAPP', 'EMAIL', 'SMS'] as const;
export type ContactChannelPreference = (typeof CONTACT_CHANNEL_PREFERENCES)[number];

export const CONTACT_TIME_PREFERENCES = ['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME'] as const;
export type ContactTimePreference = (typeof CONTACT_TIME_PREFERENCES)[number];

export const PURCHASE_PURPOSES = ['LIVING', 'INVESTMENT', 'VACATION_HOME'] as const;
export type PurchasePurpose = (typeof PURCHASE_PURPOSES)[number];

export const PAYMENT_PREFERENCE_LABELS: Record<PaymentPreference, string> = {
  CASH: 'Cash',
  INSTALLMENTS: 'Installments',
  MORTGAGE: 'Mortgage',
  FLEXIBLE: 'Flexible',
};

export const CONTACT_CHANNEL_LABELS: Record<ContactChannelPreference, string> = {
  CALL: 'Phone call',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  SMS: 'SMS',
};

export const CONTACT_TIME_LABELS: Record<ContactTimePreference, string> = {
  MORNING: 'Morning (9–12)',
  AFTERNOON: 'Afternoon (12–5)',
  EVENING: 'Evening (5–10)',
  ANYTIME: 'Any time',
};

export const PURCHASE_PURPOSE_LABELS: Record<PurchasePurpose, string> = {
  LIVING: 'To live in',
  INVESTMENT: 'Investment',
  VACATION_HOME: 'Vacation home',
};

/**
 * Lenient CSV parsing: accepts the enum value or its label in any case
 * ("installments", "Installments", "INSTALLMENTS"). Unknown → undefined.
 */
export function parseProfileOption<T extends string>(
  raw: string | undefined | null,
  values: readonly T[],
  labels: Record<T, string>,
): T | undefined {
  const text = raw?.trim().toLowerCase();
  if (!text) return undefined;
  for (const value of values) {
    if (value.toLowerCase() === text) return value;
    const label = labels[value].toLowerCase();
    if (label === text || label.split(' (')[0] === text) return value;
  }
  return undefined;
}
