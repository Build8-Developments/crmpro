import { dayBoundsInZone } from '@crmpro/shared/workflow';
import {
  monthBounds,
  periodOf,
  shiftPeriod,
} from '../../../common/utils/month-period.util';

export const DASHBOARD_PERIODS = [
  'this-month',
  'last-month',
  'last-30-days',
  'last-90-days',
] as const;
export type DashboardPeriodKey = (typeof DASHBOARD_PERIODS)[number];
export const DASHBOARD_PERIOD_DEFAULT: DashboardPeriodKey = 'this-month';

/**
 * The window a dashboard section reports on, resolved in the workspace time
 * zone, plus the window it is compared with (`previous*`).
 */
export interface DashboardPeriod {
  key: DashboardPeriodKey;
  timeZone: string;
  /** Inclusive start. */
  from: Date;
  /** Exclusive end (now, for windows that run to today). */
  to: Date;
  /** Same-length window just before (month-to-date compares to the same days of last month). */
  previousFrom: Date;
  previousTo: Date;
  /** Calendar months ("YYYY-MM") the window touches — for targets and spend. */
  months: string[];
  /** Set when the window is exactly one calendar month (targets apply as-is). */
  month: string | null;
  now: Date;
}

const DAY_MS = 86_400_000;

export function resolveDashboardPeriod(
  key: DashboardPeriodKey,
  timeZone: string,
  now = new Date(),
): DashboardPeriod {
  const current = periodOf(now, timeZone);
  if (key === 'this-month') {
    const { start } = monthBounds(current, timeZone);
    const prev = monthBounds(shiftPeriod(current, -1), timeZone);
    const elapsed = now.getTime() - start.getTime();
    return {
      key,
      timeZone,
      from: start,
      to: now,
      previousFrom: prev.start,
      previousTo: new Date(
        Math.min(prev.start.getTime() + elapsed, prev.end.getTime()),
      ),
      months: [current],
      month: current,
      now,
    };
  }
  if (key === 'last-month') {
    const last = shiftPeriod(current, -1);
    const bounds = monthBounds(last, timeZone);
    const prev = monthBounds(shiftPeriod(last, -1), timeZone);
    return {
      key,
      timeZone,
      from: bounds.start,
      to: bounds.end,
      previousFrom: prev.start,
      previousTo: prev.end,
      months: [last],
      month: last,
      now,
    };
  }
  const days = key === 'last-30-days' ? 30 : 90;
  const todayStart = dayBoundsInZone(now, timeZone).start;
  const from = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
  const length = now.getTime() - from.getTime();
  const months: string[] = [];
  for (let p = periodOf(from, timeZone); p <= current; p = shiftPeriod(p, 1)) {
    months.push(p);
  }
  return {
    key,
    timeZone,
    from,
    to: now,
    previousFrom: new Date(from.getTime() - length),
    previousTo: from,
    months,
    month: null,
    now,
  };
}
