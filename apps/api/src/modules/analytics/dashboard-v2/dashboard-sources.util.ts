import type { MonthBounds } from '../../../common/utils/month-period.util';
import type { DashboardPeriod } from './dashboard-period';

/** part / whole × 100 with one decimal; null when there is no whole. */
export function rate(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/** spend / count rounded to the unit; null without spend or without count. */
export function costPer(spend: number | null, count: number): number | null {
  if (spend === null || spend <= 0 || count <= 0) return null;
  return Math.round(spend / count);
}

/**
 * Share of a month's spend entry that belongs to the window.
 *
 * - A window that is exactly one calendar month uses that month's entry as-is.
 * - Rolling windows take each month in proportion to the time they cover.
 *   The month still running is measured against its elapsed part only: its
 *   entry is read as "spent so far", which is how owners fill it during the
 *   month (a 30-day window that holds all of November-to-date takes the whole
 *   November entry, and 13 of October's 31 days).
 */
export function spendShare(
  month: string,
  period: Pick<DashboardPeriod, 'from' | 'to' | 'month' | 'now'>,
  bounds: MonthBounds,
): number {
  if (period.month !== null) return period.month === month ? 1 : 0;
  const monthStart = bounds.start.getTime();
  const monthEnd = Math.min(bounds.end.getTime(), period.now.getTime());
  const start = Math.max(period.from.getTime(), monthStart);
  const end = Math.min(period.to.getTime(), monthEnd);
  const length = monthEnd - monthStart;
  if (end <= start || length <= 0) return 0;
  return Math.min(1, (end - start) / length);
}

/** Spend per source for the window. */
export function prorateSpend(
  rows: ReadonlyArray<{ sourceId: string; period: string; amount: number }>,
  period: Pick<DashboardPeriod, 'from' | 'to' | 'month' | 'now'>,
  boundsOf: (month: string) => MonthBounds,
): Map<string, number> {
  const shares = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const row of rows) {
    let share = shares.get(row.period);
    if (share === undefined) {
      share = spendShare(row.period, period, boundsOf(row.period));
      shares.set(row.period, share);
    }
    if (share === 0) continue;
    bySource.set(
      row.sourceId,
      (bySource.get(row.sourceId) ?? 0) + row.amount * share,
    );
  }
  for (const [sourceId, amount] of bySource) {
    bySource.set(sourceId, Math.round(amount * 100) / 100);
  }
  return bySource;
}
