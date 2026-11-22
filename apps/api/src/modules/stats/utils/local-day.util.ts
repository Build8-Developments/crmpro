import { getZonedParts, zonedTimeToUtc } from '@crmpro/shared/workflow';

/**
 * Local calendar days ("YYYY-MM-DD" in the workspace time zone). Stats rows
 * are keyed by them; their UTC bounds come from the zone so 23- and 25-hour
 * DST days are handled (Cairo springs forward at midnight).
 */

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60_000;

function parse(day: string): { year: number; month: number; day: number } {
  const match = DAY_PATTERN.exec(day);
  if (!match) throw new Error(`Invalid local day: ${day}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function format(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** A real calendar date in YYYY-MM-DD form. */
export function isLocalDay(value: string): boolean {
  const match = DAY_PATTERN.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** The local day containing `date` in `timeZone`. */
export function localDayOf(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return format(p.year, p.month, p.day);
}

/** `day` + `offset` calendar days. */
export function addDays(day: string, offset: number): string {
  const p = parse(day);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + offset));
  return shifted.toISOString().slice(0, 10);
}

/** Calendar days from `from` to `to`, inclusive (0 when `to` < `from`). */
export function daysInRange(from: string, to: string): number {
  const diff = dayToDbDate(to).getTime() - dayToDbDate(from).getTime();
  return diff < 0 ? 0 : Math.round(diff / DAY_MS) + 1;
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(day: string): number {
  return dayToDbDate(day).getUTCDay();
}

/** [start, end) of a local day as UTC instants. */
export function localDayBounds(
  day: string,
  timeZone: string,
): { start: Date; end: Date } {
  const p = parse(day);
  const next = parse(addDays(day, 1));
  return {
    start: zonedTimeToUtc(p.year, p.month, p.day, 0, 0, timeZone),
    end: zonedTimeToUtc(next.year, next.month, next.day, 0, 0, timeZone),
  };
}

/** Value for a `@db.Date` column (Prisma reads/writes them as UTC midnight). */
export function dayToDbDate(day: string): Date {
  parse(day);
  return new Date(`${day}T00:00:00.000Z`);
}

export function dbDateToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
