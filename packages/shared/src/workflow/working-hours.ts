import { getZonedParts, zonedTimeToUtc } from './time-zone.util';

/**
 * Working hours of a tenant. SLA clocks (first contact, escalation) only run
 * inside them: a lead assigned at 23:00 is due at opening time + 15 min.
 */
export interface WorkSchedule {
  timeZone: string;
  /** 0 = Sunday … 6 = Saturday. */
  workingDays: readonly number[];
  /** Minutes after midnight, in `timeZone`. */
  startMinute: number;
  endMinute: number;
}

/** Egyptian default: Saturday to Thursday, 10:00–19:00 Cairo time. */
export const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  timeZone: 'Africa/Cairo',
  workingDays: [0, 1, 2, 3, 4, 6],
  startMinute: 10 * 60,
  endMinute: 19 * 60,
};

const MINUTE = 60_000;
const MAX_DAYS_SCANNED = 14;

/** A schedule with no days or an empty window means "always open". */
function isAlwaysOpen(schedule: WorkSchedule): boolean {
  return (
    schedule.workingDays.length === 0 ||
    schedule.endMinute <= schedule.startMinute
  );
}

/** Calendar day `offset` days after the zoned date of `parts`. */
function shiftDay(year: number, month: number, day: number, offset: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + offset));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

function atMinute(
  date: { year: number; month: number; day: number },
  minuteOfDay: number,
  timeZone: string,
): Date {
  return zonedTimeToUtc(
    date.year,
    date.month,
    date.day,
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60,
    timeZone,
  );
}

export function isWorkingTime(date: Date, schedule: WorkSchedule): boolean {
  if (isAlwaysOpen(schedule)) return true;
  const p = getZonedParts(date, schedule.timeZone);
  const minute = p.hour * 60 + p.minute;
  return (
    schedule.workingDays.includes(p.weekday) &&
    minute >= schedule.startMinute &&
    minute < schedule.endMinute
  );
}

/** `date` itself when it is working time, else the next opening time. */
export function nextWorkingStart(date: Date, schedule: WorkSchedule): Date {
  if (isAlwaysOpen(schedule)) return date;
  const p = getZonedParts(date, schedule.timeZone);
  const minute = p.hour * 60 + p.minute;
  for (let offset = 0; offset <= MAX_DAYS_SCANNED; offset += 1) {
    const day = shiftDay(p.year, p.month, p.day, offset);
    if (!schedule.workingDays.includes(day.weekday)) continue;
    if (offset === 0) {
      if (minute < schedule.startMinute) {
        return atMinute(day, schedule.startMinute, schedule.timeZone);
      }
      if (minute < schedule.endMinute) return date;
      continue;
    }
    return atMinute(day, schedule.startMinute, schedule.timeZone);
  }
  return date;
}

/** End of the working window that contains `date` (must be working time). */
function windowEnd(date: Date, schedule: WorkSchedule): Date {
  const p = getZonedParts(date, schedule.timeZone);
  return atMinute(p, schedule.endMinute, schedule.timeZone);
}

/** `from` + `minutes` of working time. */
export function addWorkingMinutes(
  from: Date,
  minutes: number,
  schedule: WorkSchedule,
): Date {
  if (isAlwaysOpen(schedule)) return new Date(from.getTime() + minutes * MINUTE);
  let cursor = nextWorkingStart(from, schedule);
  let remaining = minutes * MINUTE;
  for (let guard = 0; guard <= MAX_DAYS_SCANNED; guard += 1) {
    const end = windowEnd(cursor, schedule);
    const available = end.getTime() - cursor.getTime();
    if (remaining <= available) return new Date(cursor.getTime() + remaining);
    remaining -= available;
    cursor = nextWorkingStart(end, schedule);
  }
  return cursor;
}

/** Working minutes elapsed between `from` and `to` (0 when `to` <= `from`). */
export function workingMinutesBetween(
  from: Date,
  to: Date,
  schedule: WorkSchedule,
): number {
  if (to <= from) return 0;
  if (isAlwaysOpen(schedule)) return Math.floor((to.getTime() - from.getTime()) / MINUTE);
  let cursor = nextWorkingStart(from, schedule);
  let total = 0;
  for (let guard = 0; guard <= 400 && cursor < to; guard += 1) {
    const end = windowEnd(cursor, schedule);
    const stop = end < to ? end : to;
    total += stop.getTime() - cursor.getTime();
    if (end >= to) break;
    cursor = nextWorkingStart(end, schedule);
  }
  return Math.floor(total / MINUTE);
}
