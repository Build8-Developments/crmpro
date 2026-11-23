import { TargetMetric } from '@crmpro/database';
import {
  type WorkSchedule,
  workingMinutesBetween,
} from '@crmpro/shared/workflow';
import type { MonthBounds } from '../../../common/utils/month-period.util';
import type { DashboardPeriod } from './dashboard-period';

/** The target shown as "Target %": the first one set in this order. */
export const TARGET_HEADLINE_ORDER: readonly TargetMetric[] = [
  TargetMetric.DEALS,
  TargetMetric.REVENUE,
  TargetMetric.COMMISSION,
  TargetMetric.INTERACTIONS,
  TargetMetric.VISITS,
];

/** part / whole × 100 with one decimal; null when there is no whole. */
export function percentOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/** Median (average of the two middle values for an even count); null when empty. */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 1
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 10) / 10;
}

/** Working minutes from assignment to the first touch (0 when touched off-hours). */
export function firstResponseSample(
  startedAt: Date,
  contactedAt: Date,
  schedule: WorkSchedule,
): number {
  return workingMinutesBetween(startedAt, contactedAt, schedule);
}

/**
 * Share of a month's target that applies to the window. A window that is one
 * calendar month (this month, last month) uses the month's target as-is — the
 * same as the targets screen, so month-to-date reads "x% of the month's goal".
 * Rolling windows (last 30 / 90 days) take each month's target in proportion
 * to the time of the month they cover.
 */
export function monthShare(
  month: string,
  period: Pick<DashboardPeriod, 'from' | 'to' | 'month'>,
  bounds: MonthBounds,
): number {
  if (period.month !== null) return period.month === month ? 1 : 0;
  const start = Math.max(period.from.getTime(), bounds.start.getTime());
  const end = Math.min(period.to.getTime(), bounds.end.getTime());
  const length = bounds.end.getTime() - bounds.start.getTime();
  if (end <= start || length <= 0) return 0;
  return (end - start) / length;
}

/** Targets per user per metric for the window (see monthShare). */
export function prorateTargets(
  targets: ReadonlyArray<{
    userId: string | null;
    period: string;
    metric: TargetMetric;
    value: number;
  }>,
  period: Pick<DashboardPeriod, 'from' | 'to' | 'month'>,
  boundsOf: (month: string) => MonthBounds,
): Map<string, Map<TargetMetric, number>> {
  const shares = new Map<string, number>();
  const result = new Map<string, Map<TargetMetric, number>>();
  for (const target of targets) {
    if (!target.userId) continue;
    let share = shares.get(target.period);
    if (share === undefined) {
      share = monthShare(target.period, period, boundsOf(target.period));
      shares.set(target.period, share);
    }
    if (share === 0) continue;
    const metrics =
      result.get(target.userId) ?? new Map<TargetMetric, number>();
    metrics.set(
      target.metric,
      (metrics.get(target.metric) ?? 0) + target.value * share,
    );
    result.set(target.userId, metrics);
  }
  return result;
}
