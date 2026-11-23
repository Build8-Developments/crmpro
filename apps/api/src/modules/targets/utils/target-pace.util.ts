import type { TargetMetric } from '@crmpro/database';
import { getZonedParts, type WorkSchedule } from '@crmpro/shared/workflow';
import {
  daysInMonth,
  parsePeriod,
  periodOf,
} from '../../../common/utils/month-period.util';
import { COUNT_METRICS, MONEY_SUGGESTION_STEP } from '../targets.constants';
import type { MetricProgress, MonthPace } from '../targets.types';

const MINUTES_PER_DAY = 24 * 60;

/**
 * How much of `period` has passed, in working days (Settings → Workday).
 * Today counts by the share of its working window already gone, so at 10:00
 * nobody is "behind" for the day that just started. Past months are 1,
 * future months 0. A schedule without working days falls back to calendar
 * days.
 */
export function monthPace(
  period: string,
  now: Date,
  schedule: WorkSchedule,
): MonthPace {
  const { year, month } = parsePeriod(period);
  const totalDays = daysInMonth(period);
  const useCalendar = schedule.workingDays.length === 0;
  const isWorkingDay = (day: number) =>
    useCalendar ||
    schedule.workingDays.includes(
      new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    );

  let workingDays = 0;
  for (let day = 1; day <= totalDays; day += 1) {
    if (isWorkingDay(day)) workingDays += 1;
  }

  const current = periodOf(now, schedule.timeZone);
  if (period < current) {
    return { workingDays, elapsedWorkingDays: workingDays, share: 1 };
  }
  if (period > current || workingDays === 0) {
    return { workingDays, elapsedWorkingDays: 0, share: 0 };
  }

  const today = getZonedParts(now, schedule.timeZone);
  let elapsed = 0;
  for (let day = 1; day < today.day; day += 1) {
    if (isWorkingDay(day)) elapsed += 1;
  }
  if (isWorkingDay(today.day)) {
    elapsed += todayFraction(today.hour * 60 + today.minute, schedule);
  }

  return {
    workingDays,
    elapsedWorkingDays: round2(elapsed),
    share: Math.min(1, elapsed / workingDays),
  };
}

/** Share (0–1) of today's working window that has passed. */
function todayFraction(minuteOfDay: number, schedule: WorkSchedule): number {
  const windowLength = schedule.endMinute - schedule.startMinute;
  if (windowLength <= 0) return minuteOfDay / MINUTES_PER_DAY;
  const passed = (minuteOfDay - schedule.startMinute) / windowLength;
  return Math.min(1, Math.max(0, passed));
}

/**
 * Target vs actual at an even pace. Counts are behind by whole units (a gap
 * under half a unit is still on track); money by whole currency units.
 */
export function evaluateProgress(
  metric: TargetMetric,
  target: number | null,
  actual: number,
  share: number,
): MetricProgress {
  if (target === null) {
    return {
      metric,
      target: null,
      actual,
      expected: null,
      percent: null,
      status: null,
      behindBy: 0,
    };
  }

  const expected = target * share;
  const percent = target === 0 ? 100 : round2((actual / target) * 100);
  const gap = Math.round(expected - actual);

  if (actual >= target) {
    return {
      metric,
      target,
      actual,
      expected: round2(expected),
      percent,
      status: 'HIT',
      behindBy: 0,
    };
  }

  return {
    metric,
    target,
    actual,
    expected: COUNT_METRICS.has(metric)
      ? round2(expected)
      : Math.round(expected),
    percent,
    status: gap > 0 ? 'BEHIND' : 'ON_TRACK',
    behindBy: Math.max(0, gap),
  };
}

/**
 * A proposed target from an average: whole units for counts, the nearest
 * EGP 10,000 for money. Nothing (null) when the history rounds to zero.
 */
export function roundSuggestion(
  metric: TargetMetric,
  average: number,
): number | null {
  const rounded = COUNT_METRICS.has(metric)
    ? Math.round(average)
    : Math.round(average / MONEY_SUGGESTION_STEP) * MONEY_SUGGESTION_STEP;
  return rounded > 0 ? rounded : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
