/**
 * Client contact details are masked everywhere by default; the real value is
 * fetched on demand through a logged "contact access" (reveal, copy, call…).
 */

export const CONTACT_FIELDS = ['primaryPhone', 'secondaryPhone', 'email'] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export const CONTACT_ACCESS_ACTIONS = ['REVEAL', 'COPY', 'CALL', 'WHATSAPP', 'EMAIL', 'EDIT'] as const;
export type ContactAccessAction = (typeof CONTACT_ACCESS_ACTIONS)[number];

export const CONTACT_FIELD_LABELS: Record<ContactField, string> = {
  primaryPhone: 'phone',
  secondaryPhone: 'second phone',
  email: 'email',
};

export const CONTACT_ACCESS_LABELS: Record<ContactAccessAction, string> = {
  REVEAL: 'Revealed',
  COPY: 'Copied',
  CALL: 'Called',
  WHATSAPP: 'Opened WhatsApp for',
  EMAIL: 'Emailed',
  EDIT: 'Opened for editing',
};

const MASK = '•';

/** "01012345678" → "010••••••78" (keeps the operator prefix and last 2). */
export function maskPhone(phone: string): string {
  const value = phone.trim();
  if (value.length <= 5) return MASK.repeat(value.length);
  return `${value.slice(0, 3)}${MASK.repeat(value.length - 5)}${value.slice(-2)}`;
}

/** "ahmed.hassan@gmail.com" → "a••••@gmail.com". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return MASK.repeat(Math.min(email.length, 8));
  return `${local.slice(0, 1)}${MASK.repeat(4)}@${domain}`;
}
