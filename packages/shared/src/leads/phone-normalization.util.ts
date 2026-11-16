/**
 * Phone normalization for duplicate detection and search.
 *
 * CRMPro's market is Egypt-first, so numbers without an explicit country code
 * are treated as Egyptian. The output is E.164-like (`+<country><number>`) so
 * that `01001234567`, `+20 100 123 4567`, `00201001234567` and
 * `٠١٠٠١٢٣٤٥٦٧` all produce the same key: `+201001234567`.
 *
 * The SQL migration `20261116120000_normalize_lead_phones` mirrors these rules
 * to backfill existing rows; keep both in sync.
 */

const EGYPT_COUNTRY_CODE = '20';

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const EASTERN_ARABIC_INDIC_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Converts Arabic-Indic and Eastern Arabic-Indic digits to ASCII digits. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (char) => {
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(char);
    if (arabicIndex >= 0) return String(arabicIndex);
    return String(EASTERN_ARABIC_INDIC_DIGITS.indexOf(char));
  });
}

export function normalizePhone(phone: string): string {
  const ascii = toAsciiDigits(phone.trim());
  const hasPlus = ascii.startsWith('+');
  let digits = ascii.replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  }

  if (hasPlus) {
    return `+${digits}`;
  }

  // International dialling prefix: 0020…, 00971…
  if (digits.startsWith('00')) {
    return `+${digits.slice(2)}`;
  }

  // Egyptian number already carrying the country code without "+":
  // 20 + 10-digit mobile (201001234567) or 20 + 9-digit landline (20223456789).
  if (
    digits.startsWith(EGYPT_COUNTRY_CODE) &&
    (digits.length === 12 || digits.length === 11)
  ) {
    return `+${digits}`;
  }

  // Egyptian national format with trunk prefix: 01001234567, 0223456789.
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
    return `+${EGYPT_COUNTRY_CODE}${digits}`;
  }

  // Egyptian mobile typed without the leading 0: 1001234567.
  if (digits.length === 10 && digits.startsWith('1')) {
    return `+${EGYPT_COUNTRY_CODE}${digits}`;
  }

  // Unknown shape: keep the digits so it still deduplicates against itself.
  return digits;
}

/**
 * Reduces free-text search input to the digit core that should be matched
 * (substring) against normalized phone columns, or `null` when the input does
 * not look like a phone fragment.
 */
export function phoneSearchCore(search: string): string | null {
  const ascii = toAsciiDigits(search.trim());
  if (/[a-z@]/i.test(ascii)) {
    return null;
  }

  let digits = ascii.replace(/\D/g, '');
  if (digits.length < 4) {
    return null;
  }

  digits = digits.replace(/^00/, '');
  if (digits.startsWith(EGYPT_COUNTRY_CODE) && digits.length >= 11) {
    digits = digits.slice(EGYPT_COUNTRY_CODE.length);
  }
  return digits.replace(/^0+/, '') || null;
}
