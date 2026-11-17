/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits → Latin. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

/**
 * Excel stores phone columns as numbers and drops the trunk zero
 * (01012345678 → 1012345678). Put it back for the tenant's country when the
 * digit count makes the intent unambiguous.
 */
const TRUNK_ZERO_RULES: Record<string, { length: number; startsWith: string }> =
  {
    EG: { length: 10, startsWith: '1' },
    SA: { length: 9, startsWith: '5' },
    AE: { length: 9, startsWith: '5' },
    JO: { length: 9, startsWith: '7' },
    MA: { length: 9, startsWith: '6' },
  };

export function cleanImportedPhone(value: string, countryCode: string): string {
  const latin = toLatinDigits(value).trim();
  const rule = TRUNK_ZERO_RULES[countryCode.toUpperCase()];

  if (
    rule &&
    /^\d+$/.test(latin) &&
    latin.length === rule.length &&
    latin.startsWith(rule.startsWith)
  ) {
    return `0${latin}`;
  }

  return latin;
}

/**
 * "1,500,000", "1.5M", "750k", "٢ مليون", "500 ألف" → number. Returns
 * `undefined` for blanks and `null` when the text is not a number.
 */
export function parseImportedAmount(value: string): number | null | undefined {
  const text = toLatinDigits(value).trim().toLowerCase();

  if (text.length === 0) {
    return undefined;
  }

  let multiplier = 1;
  if (/(million|مليون|\dm\b|\dm$)/.test(text)) {
    multiplier = 1_000_000;
  } else if (/(thousand|ألف|الف|\dk\b|\dk$)/.test(text)) {
    multiplier = 1_000;
  }

  const numeric = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!numeric) {
    return null;
  }

  const amount = Number(numeric[0]) * multiplier;
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/** "Palm Hills, Mivida ، Zed" → three names. */
export function splitImportedList(value: string): string[] {
  return value
    .split(/[,،;|/\n]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

const TRUE_WORDS = new Set([
  'true',
  'yes',
  'y',
  '1',
  'نعم',
  'اه',
  'أيوه',
  'ايوه',
]);
const FALSE_WORDS = new Set(['false', 'no', 'n', '0', 'لا', 'لأ']);

/** Spreadsheet yes/no text → boolean; unknown text is passed through. */
export function parseImportedBoolean(value: string): boolean | string {
  const text = toLatinDigits(value).trim().toLowerCase();
  if (TRUE_WORDS.has(text)) return true;
  if (FALSE_WORDS.has(text)) return false;
  return value;
}

/**
 * Day-first dates as written in the region (17/11/2026, 17-11-2026) →
 * YYYY-MM-DD. ISO and anything else is passed through unchanged.
 */
export function normalizeImportedDate(value: string): string {
  const text = toLatinDigits(value).trim();
  const match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);

  if (!match) {
    return text;
  }

  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}
