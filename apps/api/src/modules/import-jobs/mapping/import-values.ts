import {
  CONTACT_CHANNEL_LABELS,
  CONTACT_CHANNEL_PREFERENCES,
  CONTACT_TIME_LABELS,
  CONTACT_TIME_PREFERENCES,
  PAYMENT_PREFERENCE_LABELS,
  PAYMENT_PREFERENCES,
  PURCHASE_PURPOSE_LABELS,
  PURCHASE_PURPOSES,
  parseProfileOption,
  type ContactChannelPreference,
  type ContactTimePreference,
  type PaymentPreference,
  type PurchasePurpose,
} from '@crmpro/shared/leads';

/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits → Latin. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.') // Arabic decimal separator
    .replace(/٬/g, ','); // Arabic thousands separator
}

/** Bidi marks and other invisible characters spreadsheets leave in cells. */
const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/**
 * Spreadsheet phone text → what the lead normalizer expects. Strips spaces,
 * dashes, dots and brackets, and restores the trunk zero Excel drops from
 * Egyptian mobiles stored as numbers (1012345678 → 01012345678).
 */
export function cleanImportedPhone(value: string): string {
  const compact = toLatinDigits(value)
    .replace(INVISIBLE_CHARS, '')
    .replace(/[\s\-.()/\u00A0]/g, '');

  if (/^1\d{9}$/.test(compact)) {
    return `0${compact}`;
  }

  return compact;
}

const MILLION_WORDS = /(million|mil|mn|مليون|ملايين)/;
const THOUSAND_WORDS = /(thousand|الف|ألف|آلاف|الاف)/;

/**
 * "1,500,000", "1.5M", "750k", "٣ مليون", "500 ألف", "EGP 2,000,000" →
 * number. Returns undefined for blanks and text that is not an amount.
 */
export function parseImportedAmount(value: string): number | undefined {
  const text = toLatinDigits(value).replace(INVISIBLE_CHARS, '').trim();
  if (text.length === 0) return undefined;
  const lower = text.toLowerCase();

  let multiplier = 1;
  if (MILLION_WORDS.test(lower) || /\d\s*m\b/.test(lower)) {
    multiplier = 1_000_000;
  } else if (THOUSAND_WORDS.test(lower) || /\d\s*k\b/.test(lower)) {
    multiplier = 1_000;
  }

  // Thousands separators: "2,500,000" / "2 500 000". A comma followed by
  // exactly 1-2 digits at the end is a decimal comma ("2,5 مليون").
  let numeric = lower.replace(/(\d)[\s\u00A0](?=\d{3}\b)/g, '$1');
  numeric =
    /\d,\d{1,2}(?!\d)/.test(numeric) && !/\d,\d{3}/.test(numeric)
      ? numeric.replace(',', '.')
      : numeric.replace(/,/g, '');

  const match = numeric.match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;

  const amount = Math.round(Number(match[0]) * multiplier);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

/**
 * One budget cell: a single amount (min = max) or a range ("2-3M",
 * "2M - 3M", "من 2 إلى 3 مليون"). A unit written once applies to both ends.
 */
export function parseImportedBudget(value: string): {
  min?: number;
  max?: number;
} {
  const text = toLatinDigits(value).trim();
  if (text.length === 0) return {};

  const parts = text
    .replace(/^(from|من)\s+/i, '')
    .split(/\s*(?:-|–|—|~|\bto\b|إلى|الى)\s*/i)
    .map((part) => part.trim())
    .filter((part) => /\d/.test(part));

  if (parts.length === 2) {
    // "2-3M": the unit written once on the upper end applies to both.
    const hasUnit = /[^\d.,\s]/.test(parts[0]);
    const unit = parts[1].replace(/^[\d.,\s]+/, '');
    const min = parseImportedAmount(hasUnit ? parts[0] : `${parts[0]} ${unit}`);
    const max = parseImportedAmount(parts[1]);
    if (min !== undefined && max !== undefined) {
      return min <= max ? { min, max } : { min: max, max: min };
    }
    const only = min ?? max;
    return only === undefined ? {} : { min: only, max: only };
  }

  const amount = parseImportedAmount(text);
  return amount === undefined ? {} : { min: amount, max: amount };
}

/** "Palm Hills, Mivida ، Zed / Sodic | Hyde Park" → five names. */
export function splitImportedList(value: string): string[] {
  return value
    .split(/[,،;|/\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Free text cell → trimmed single-spaced text (max `limit` chars). */
export function cleanImportedText(
  value: string,
  limit = 120,
): string | undefined {
  const text = value.replace(INVISIBLE_CHARS, '').trim().replace(/\s+/g, ' ');
  return text.length > 0 ? text.slice(0, limit) : undefined;
}

/** Lowercase + Arabic letter variants unified, for matching names. */
export function normalizeLookupKey(value: string): string {
  return toLatinDigits(value)
    .replace(INVISIBLE_CHARS, '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Words people actually type in these columns (Arabic and English) beyond
 * the enum value and its label, compared after `normalizeLookupKey`.
 */
const PAYMENT_ALIASES = normalizeAliases<PaymentPreference>({
  كاش: 'CASH',
  نقدي: 'CASH',
  نقدا: 'CASH',
  'دفع كاش': 'CASH',
  تقسيط: 'INSTALLMENTS',
  قسط: 'INSTALLMENTS',
  اقساط: 'INSTALLMENTS',
  installment: 'INSTALLMENTS',
  'تمويل عقاري': 'MORTGAGE',
  تمويل: 'MORTGAGE',
  'رهن عقاري': 'MORTGAGE',
  مرن: 'FLEXIBLE',
  'اي طريقه': 'FLEXIBLE',
});

const CONTACT_CHANNEL_ALIASES = normalizeAliases<ContactChannelPreference>({
  call: 'CALL',
  phone: 'CALL',
  مكالمه: 'CALL',
  اتصال: 'CALL',
  تليفون: 'CALL',
  موبايل: 'CALL',
  واتساب: 'WHATSAPP',
  واتس: 'WHATSAPP',
  'واتس اب': 'WHATSAPP',
  whats: 'WHATSAPP',
  ايميل: 'EMAIL',
  'البريد الالكتروني': 'EMAIL',
  بريد: 'EMAIL',
  'e-mail': 'EMAIL',
  رساله: 'SMS',
  رسائل: 'SMS',
  'رساله نصيه': 'SMS',
});

const CONTACT_TIME_ALIASES = normalizeAliases<ContactTimePreference>({
  صباحا: 'MORNING',
  الصبح: 'MORNING',
  صباح: 'MORNING',
  الصباح: 'MORNING',
  ظهرا: 'AFTERNOON',
  الظهر: 'AFTERNOON',
  'بعد الظهر': 'AFTERNOON',
  العصر: 'AFTERNOON',
  مساء: 'EVENING',
  مساءا: 'EVENING',
  المساء: 'EVENING',
  بالليل: 'EVENING',
  'اي وقت': 'ANYTIME',
  'في اي وقت': 'ANYTIME',
  anytime: 'ANYTIME',
});

const PURCHASE_PURPOSE_ALIASES = normalizeAliases<PurchasePurpose>({
  living: 'LIVING',
  live: 'LIVING',
  residence: 'LIVING',
  سكن: 'LIVING',
  للسكن: 'LIVING',
  سكني: 'LIVING',
  استثمار: 'INVESTMENT',
  للاستثمار: 'INVESTMENT',
  استثماري: 'INVESTMENT',
  invest: 'INVESTMENT',
  مصيف: 'VACATION_HOME',
  ساحلي: 'VACATION_HOME',
  اجازه: 'VACATION_HOME',
  'بيت اجازه': 'VACATION_HOME',
  summer: 'VACATION_HOME',
  vacation: 'VACATION_HOME',
});

function normalizeAliases<T extends string>(
  aliases: Record<string, T>,
): Map<string, T> {
  return new Map(
    Object.entries(aliases).map(([alias, value]) => [
      normalizeLookupKey(alias),
      value,
    ]),
  );
}

function withAliases<T extends string>(
  raw: string | undefined,
  values: readonly T[],
  labels: Record<T, string>,
  aliases: Map<string, T>,
): T | undefined {
  const text = raw?.replace(INVISIBLE_CHARS, '').trim();
  if (!text) return undefined;
  return (
    parseProfileOption(text, values, labels) ??
    aliases.get(normalizeLookupKey(text))
  );
}

export function parsePaymentPreference(
  raw: string | undefined,
): PaymentPreference | undefined {
  return withAliases(
    raw,
    PAYMENT_PREFERENCES,
    PAYMENT_PREFERENCE_LABELS,
    PAYMENT_ALIASES,
  );
}

export function parseContactChannel(
  raw: string | undefined,
): ContactChannelPreference | undefined {
  return withAliases(
    raw,
    CONTACT_CHANNEL_PREFERENCES,
    CONTACT_CHANNEL_LABELS,
    CONTACT_CHANNEL_ALIASES,
  );
}

export function parseContactTime(
  raw: string | undefined,
): ContactTimePreference | undefined {
  return withAliases(
    raw,
    CONTACT_TIME_PREFERENCES,
    CONTACT_TIME_LABELS,
    CONTACT_TIME_ALIASES,
  );
}

export function parsePurchasePurpose(
  raw: string | undefined,
): PurchasePurpose | undefined {
  return withAliases(
    raw,
    PURCHASE_PURPOSES,
    PURCHASE_PURPOSE_LABELS,
    PURCHASE_PURPOSE_ALIASES,
  );
}
