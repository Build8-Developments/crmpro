/**
 * Minimal time-zone helpers on top of Intl (works in Node and browsers, no
 * dependency). Used to place "tomorrow 11:00" and "today" in the tenant's
 * time zone rather than the server's.
 */

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: WEEKDAYS.indexOf(get('weekday')),
  };
}

/** Offset (ms) of `timeZone` from UTC at `date`. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const rounded = Math.floor(date.getTime() / 60_000) * 60_000;
  return asUtc - rounded;
}

/** The UTC instant of a wall-clock time in `timeZone`. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - zoneOffsetMs(new Date(guess), timeZone);
  // Second pass settles DST edges.
  return new Date(guess - zoneOffsetMs(new Date(first), timeZone));
}

/** [start, end) of the calendar day containing `date` in `timeZone`. */
export function dayBoundsInZone(
  date: Date,
  timeZone: string,
): { start: Date; end: Date } {
  const p = getZonedParts(date, timeZone);
  const start = zonedTimeToUtc(p.year, p.month, p.day, 0, 0, timeZone);
  const next = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
  const end = zonedTimeToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    0,
    0,
    timeZone,
  );
  return { start, end };
}

/** `date` + `days` calendar days, at `hour:minute` local time in `timeZone`. */
export function atLocalTime(
  date: Date,
  days: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const p = getZonedParts(date, timeZone);
  const target = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedTimeToUtc(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    target.getUTCDate(),
    hour,
    minute,
    timeZone,
  );
}
