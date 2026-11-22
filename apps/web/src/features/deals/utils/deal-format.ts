import type { DealStatus } from "@/features/deals/types";

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  RESERVED: "Reserved",
  CONTRACTED: "Contracted",
  CANCELLED: "Cancelled",
};

/** Common unit types, offered as suggestions (the field stays free text). */
export const UNIT_TYPE_SUGGESTIONS = [
  "Apartment",
  "Duplex",
  "Penthouse",
  "Studio",
  "Villa",
  "Twin house",
  "Townhouse",
  "Chalet",
  "Office",
  "Retail",
  "Clinic",
] as const;

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** "5,250,000 EGP" (or "5.3M EGP" when compact). */
export function formatMoney(
  amount: number,
  currency = "EGP",
  options: { compact?: boolean } = {},
): string {
  const key = options.compact ? "compact" : "full";
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: options.compact ? 1 : 2,
      notation: options.compact ? "compact" : "standard",
    });
    moneyFormatters.set(key, formatter);
  }
  return `${formatter.format(amount)} ${currency}`;
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDealDate(iso: string | null): string {
  return iso ? dateFormat.format(new Date(iso)) : "—";
}

/** Digits (and one dot) typed into an amount field → number, or null. */
export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Thousands separators while typing a whole amount ("5250000" → "5,250,000"). */
export function formatAmountInput(value: string): string {
  const [whole, ...rest] = value.replace(/[^\d.]/g, "").split(".");
  const grouped = whole ? Number(whole).toLocaleString("en-US") : "";
  return rest.length > 0 ? `${grouped}.${rest.join("").slice(0, 2)}` : grouped;
}

/** price × pct / 100, rounded to cents (same rule as the API). */
export function computeCommission(price: number, pct: number): number {
  return Math.round(price * pct) / 100;
}

/** "YYYY-MM-DD" for a date input, in local time. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * A picked day → ISO timestamp for the API: today → now; another day →
 * local noon, never earlier than `notBefore`. Undefined for an empty input.
 */
export function dayToIso(
  day: string,
  now: number,
  notBefore?: string | null,
): string | undefined {
  if (!day) return undefined;
  if (day === toDateInputValue(new Date(now))) return new Date(now).toISOString();
  const noon = new Date(`${day}T12:00:00`);
  if (Number.isNaN(noon.getTime())) return undefined;
  if (notBefore && noon.getTime() < new Date(notBefore).getTime()) {
    return notBefore;
  }
  return noon.toISOString();
}

/** First day of the month `offset` months from `now`, local time. */
export function monthStart(now: number, offset = 0): Date {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

/** "YYYY-MM" key for a month. */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const monthLabel = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return monthLabel.format(new Date(year, month - 1, 1));
}
