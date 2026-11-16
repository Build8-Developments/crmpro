/**
 * Option lists for Organization → General. Curated for CRMPro's market
 * (Egypt / MENA first); values are ISO codes the API validates.
 */

const regionNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;
const currencyNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "currency" })
    : null;

const COUNTRY_CODES = [
  "EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "IQ",
  "MA", "TN", "DZ", "LY", "SD", "TR", "GB", "US",
];

const CURRENCY_CODES = [
  "EGP", "SAR", "AED", "KWD", "QAR", "BHD", "OMR", "JOD", "USD", "EUR", "GBP",
];

export const COUNTRY_OPTIONS = COUNTRY_CODES.map((code) => ({
  value: code,
  label: regionNames?.of(code) ?? code,
}));

export const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code,
  label: `${code} — ${currencyNames?.of(code) ?? code}`,
}));

export const WEEK_START_OPTIONS = [
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
];

const PREFERRED_TIMEZONES = [
  "Africa/Cairo",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Asia/Qatar",
  "Asia/Bahrain",
  "Asia/Muscat",
  "Asia/Amman",
  "Asia/Beirut",
  "Asia/Baghdad",
  "Africa/Casablanca",
  "Africa/Tunis",
  "Africa/Algiers",
  "Africa/Tripoli",
  "Africa/Khartoum",
  "Europe/Istanbul",
  "Europe/London",
  "UTC",
];

/** Preferred MENA zones first, then every other zone the browser knows. */
export function getTimezoneOptions(current?: string): string[] {
  const all =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  const rest = all.filter((zone) => !PREFERRED_TIMEZONES.includes(zone));
  const options = [...PREFERRED_TIMEZONES, ...rest];
  if (current && !options.includes(current)) options.unshift(current);
  return options;
}

export function labelForCountry(code: string) {
  return regionNames?.of(code) ?? code;
}
