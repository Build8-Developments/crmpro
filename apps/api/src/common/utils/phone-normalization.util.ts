export function normalizePhone(phone: string): string {
  return phone.trim().replace(/[\s\-()]/g, '');
}

/** Dial codes of the countries a workspace can pick (TenantSettings). */
const DIAL_CODES: Record<string, { dial: string; trunkZero: boolean }> = {
  EG: { dial: '20', trunkZero: true },
  SA: { dial: '966', trunkZero: true },
  AE: { dial: '971', trunkZero: true },
  KW: { dial: '965', trunkZero: false },
  QA: { dial: '974', trunkZero: false },
  BH: { dial: '973', trunkZero: false },
  OM: { dial: '968', trunkZero: false },
  JO: { dial: '962', trunkZero: true },
  LB: { dial: '961', trunkZero: true },
  MA: { dial: '212', trunkZero: true },
};

const KNOWN_DIALS = Object.values(DIAL_CODES)
  .map((entry) => entry.dial)
  .sort((a, b) => b.length - a.length);

function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Every stored spelling of the same number: "01012345678", "+201012345678",
 * "201012345678" and "00201012345678" are one client. Leads keep the phone as
 * typed, so duplicate checks match against all of these.
 */
export function phoneMatchVariants(
  phone: string,
  countryCode: string | null | undefined,
): string[] {
  const typed = normalizePhone(phone);
  const raw = toLatinDigits(typed).replace(/[^\d+]/g, '');
  const variants = new Set<string>([typed, raw]);
  const home = DIAL_CODES[(countryCode ?? '').toUpperCase()];

  let dial: string | null = null;
  let national: string | null = null;

  const international = raw.startsWith('+')
    ? raw.slice(1)
    : raw.startsWith('00')
      ? raw.slice(2)
      : null;

  if (international) {
    dial = KNOWN_DIALS.find((code) => international.startsWith(code)) ?? null;
    national = dial ? international.slice(dial.length) : null;
  } else if (home) {
    if (home.trunkZero && raw.startsWith('0')) {
      dial = home.dial;
      national = raw.slice(1);
    } else if (
      raw.startsWith(home.dial) &&
      raw.length >= home.dial.length + 8
    ) {
      dial = home.dial;
      national = raw.slice(home.dial.length);
    } else if (!home.trunkZero) {
      dial = home.dial;
      national = raw;
    }
  }

  if (dial && national && national.length >= 6) {
    const trunk =
      Object.values(DIAL_CODES).find((entry) => entry.dial === dial)
        ?.trunkZero ?? false;
    variants.add(`+${dial}${national}`);
    variants.add(`${dial}${national}`);
    variants.add(`00${dial}${national}`);
    variants.add(trunk ? `0${national}` : national);
  }

  return [...variants].filter((value) => value.length > 0);
}
