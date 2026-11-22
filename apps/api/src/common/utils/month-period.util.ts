import { getZonedParts, zonedTimeToUtc } from '@crmpro/shared/workflow';

/**
 * Calendar months ("YYYY-MM") in a workspace time zone. Targets and marketing
 * spend are stored per month; actuals are counted between the month's local
 * midnights, so a deal at 23:30 Cairo time on the 31st belongs to that month.
 */

export const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface MonthBounds {
  /** First instant of the month (inclusive). */
  start: Date;
  /** First instant of the next month (exclusive). */
  end: Date;
}

export function isValidPeriod(value: string): boolean {
  return PERIOD_PATTERN.test(value);
}

export function parsePeriod(period: string): { year: number; month: number } {
  if (!isValidPeriod(period)) {
    throw new Error(`Invalid period "${period}", expected YYYY-MM`);
  }
  return {
    year: Number(period.slice(0, 4)),
    month: Number(period.slice(5, 7)),
  };
}

export function formatPeriod(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** `period` moved by `delta` months ("2026-01", -1 → "2025-12"). */
export function shiftPeriod(period: string, delta: number): string {
  const { year, month } = parsePeriod(period);
  const index = year * 12 + (month - 1) + delta;
  return formatPeriod(Math.floor(index / 12), (index % 12) + 1);
}

/** The month containing `date` in `timeZone`. */
export function periodOf(date: Date, timeZone: string): string {
  const parts = getZonedParts(date, timeZone);
  return formatPeriod(parts.year, parts.month);
}

/** [start, end) of the month between local midnights in `timeZone`. */
export function monthBounds(period: string, timeZone: string): MonthBounds {
  const { year, month } = parsePeriod(period);
  const next = parsePeriod(shiftPeriod(period, 1));
  return {
    start: zonedTimeToUtc(year, month, 1, 0, 0, timeZone),
    end: zonedTimeToUtc(next.year, next.month, 1, 0, 0, timeZone),
  };
}

/** Every month from `from` to `to`, both included, in order. */
export function periodRange(from: string, to: string): string[] {
  const periods: string[] = [];
  for (let cursor = from; cursor <= to; cursor = shiftPeriod(cursor, 1)) {
    periods.push(cursor);
  }
  return periods;
}

export function daysInMonth(period: string): number {
  const { year, month } = parsePeriod(period);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
