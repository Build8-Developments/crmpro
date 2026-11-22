import type { TargetMetric } from "@/features/targets/types";
import { formatNumber } from "@/lib/format";

export const METRIC_LABELS: Record<TargetMetric, string> = {
  DEALS: "Deals",
  REVENUE: "Revenue",
  COMMISSION: "Commission",
  INTERACTIONS: "Interactions",
  VISITS: "Visits",
};

export const MONEY_METRICS: ReadonlySet<TargetMetric> = new Set(["REVENUE", "COMMISSION"]);

export function isMoneyMetric(metric: TargetMetric): boolean {
  return MONEY_METRICS.has(metric);
}

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** "4.5M EGP" — same style as lead budgets. */
export function formatCompactMoney(value: number, currency: string): string {
  return `${compactNumber.format(value)} ${currency}`;
}

/** "EGP 4,500,000" for exact amounts. */
export function formatMoney(value: number, currency: string): string {
  return `${currency} ${formatNumber(value)}`;
}

/** A metric value for display: compact money or a whole number. */
export function formatMetricValue(metric: TargetMetric, value: number, currency: string): string {
  return isMoneyMetric(metric) ? formatCompactMoney(value, currency) : formatNumber(value);
}

/** "November 2026" from "2026-11" (no time zone shift: it is a label). */
export function formatPeriodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

/** "Nov" or "Nov 25" from "2025-11". */
export function formatPeriodShort(period: string, withYear = false): string {
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    ...(withYear ? { year: "2-digit" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** `period` moved by `delta` months. */
export function shiftPeriod(period: string, delta: number): string {
  const [year, month] = period.split("-").map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Parses a typed target: "" → null, invalid → undefined. */
export function parseTargetInput(metric: TargetMetric, raw: string): number | null | undefined {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return undefined;
  if (!isMoneyMetric(metric) && !Number.isInteger(value)) return undefined;
  if (isMoneyMetric(metric) && Math.round(value * 100) !== value * 100) return undefined;
  return value;
}
