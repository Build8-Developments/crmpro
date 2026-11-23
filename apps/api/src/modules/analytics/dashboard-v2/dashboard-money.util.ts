import { TargetMetric } from '@crmpro/database';
import { getZonedParts } from '@crmpro/shared/workflow';
import { monthBounds } from '../../../common/utils/month-period.util';
import type { DashboardPeriod } from './dashboard-period';
import type {
  DashboardMoneyResponse,
  MoneyTarget,
  MoneyTargetOwner,
} from './dashboard-money.types';

const DAY_MS = 86_400_000;

/** Windows up to this many days chart per day; longer ones per week. */
export const DAILY_TREND_MAX_DAYS = 31;

/** (current − previous) / previous × 100, one decimal; null when previous is 0. */
export function changePercent(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return null;
  return round1(((current - previous) / previous) * 100);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "YYYY-MM-DD" of `date` in `timeZone`. */
export function localDate(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return isoDay(Date.UTC(p.year, p.month - 1, p.day));
}

function isoDay(utcMidnight: number): string {
  return new Date(utcMidnight).toISOString().slice(0, 10);
}

function addDays(day: string, delta: number): string {
  return isoDay(Date.parse(`${day}T00:00:00Z`) + delta * DAY_MS);
}

function dayDiff(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
}

/** Local days of [from, to): first day and how many. */
function windowDays(
  from: Date,
  to: Date,
  timeZone: string,
): { first: string; count: number } {
  const first = localDate(from, timeZone);
  if (to.getTime() <= from.getTime()) return { first, count: 1 };
  const last = localDate(new Date(to.getTime() - 1), timeZone);
  return { first, count: dayDiff(first, last) + 1 };
}

/**
 * Revenue per local day (or 7-day bucket) of the window, side by side with
 * the same bucket index of the previous window. Previous buckets past the
 * current window's length (a 31-day month before a 30-day one) are left out.
 */
export function buildRevenueTrend(
  period: DashboardPeriod,
  revenueByDay: Map<string, number>,
): DashboardMoneyResponse['trend'] {
  const current = windowDays(period.from, period.to, period.timeZone);
  const previous = windowDays(
    period.previousFrom,
    period.previousTo,
    period.timeZone,
  );
  const granularity = current.count <= DAILY_TREND_MAX_DAYS ? 'day' : 'week';
  const size = granularity === 'day' ? 1 : 7;
  const buckets = Math.ceil(current.count / size);

  const points = Array.from({ length: buckets }, (_, index) => ({
    date: addDays(current.first, index * size),
    previousDate: addDays(previous.first, index * size),
    current: 0,
    previous: 0,
  }));

  for (const [day, revenue] of revenueByDay) {
    const currentIndex = dayDiff(current.first, day);
    if (currentIndex >= 0 && currentIndex < current.count) {
      points[Math.floor(currentIndex / size)].current += revenue;
      continue;
    }
    const previousIndex = dayDiff(previous.first, day);
    if (previousIndex >= 0 && previousIndex < previous.count) {
      const bucket = Math.floor(previousIndex / size);
      if (bucket < buckets) points[bucket].previous += revenue;
    }
  }

  return { granularity, points };
}

export type TargetMetricTotals = Record<
  'DEALS' | 'REVENUE' | 'COMMISSION',
  number | null
>;

/**
 * The window's target per metric from monthly targets. A single-month window
 * uses that month's target; otherwise each month counts by the share of it
 * inside [from, to) — the current month only up to now. Null = no target set
 * for any touched month.
 */
export function windowTargets(
  period: DashboardPeriod,
  targets: Array<{ period: string; metric: TargetMetric; value: number }>,
): TargetMetricTotals {
  const totals: TargetMetricTotals = {
    DEALS: null,
    REVENUE: null,
    COMMISSION: null,
  };
  const shares = new Map<string, number>();
  for (const month of period.months) {
    shares.set(month, period.month ? 1 : monthShare(month, period));
  }
  for (const target of targets) {
    const share = shares.get(target.period);
    if (share === undefined || !(target.metric in totals)) continue;
    const metric = target.metric as keyof TargetMetricTotals;
    totals[metric] = (totals[metric] ?? 0) + target.value * share;
  }
  return totals;
}

/** Share of `month` that lies inside the period window. */
function monthShare(month: string, period: DashboardPeriod): number {
  const bounds = monthBounds(month, period.timeZone);
  const start = Math.max(bounds.start.getTime(), period.from.getTime());
  const end = Math.min(bounds.end.getTime(), period.to.getTime());
  const length = bounds.end.getTime() - bounds.start.getTime();
  return end <= start || length <= 0 ? 0 : (end - start) / length;
}

/**
 * Month to date: the share of the calendar month already gone; null for
 * windows that are not the current month.
 */
export function monthElapsedShare(period: DashboardPeriod): number | null {
  if (period.key !== 'this-month' || !period.month) return null;
  const bounds = monthBounds(period.month, period.timeZone);
  const length = bounds.end.getTime() - bounds.start.getTime();
  const elapsed = period.now.getTime() - bounds.start.getTime();
  return Math.min(1, Math.max(0, elapsed / length));
}

export function toMoneyTarget(
  actual: number,
  value: number | null,
  owner: MoneyTargetOwner,
  period: DashboardPeriod,
  round: (value: number) => number,
): MoneyTarget | null {
  if (value === null) return null;
  const share = monthElapsedShare(period);
  const target = round(value);
  return {
    value: target,
    basis: period.month ? 'month' : 'prorated',
    owner,
    percent: target === 0 ? null : round1((actual / target) * 100),
    expectedByNow: share === null ? null : round(value * share),
  };
}
