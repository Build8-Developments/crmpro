import {
  addDays,
  daysInRange,
  dayToDbDate,
  dbDateToDay,
  isLocalDay,
  localDayBounds,
  localDayOf,
  weekdayOf,
} from './local-day.util';

const CAIRO = 'Africa/Cairo';
const HOUR = 3_600_000;

describe('local day helpers (Africa/Cairo)', () => {
  it('bounds a normal winter day at Cairo midnight (UTC+2)', () => {
    const { start, end } = localDayBounds('2026-11-17', CAIRO);
    expect(start.toISOString()).toBe('2026-11-16T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-17T22:00:00.000Z');
  });

  it('spring-forward day (midnight is skipped) lasts 23 hours', () => {
    const { start, end } = localDayBounds('2026-04-24', CAIRO);
    expect(start.toISOString()).toBe('2026-04-23T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-04-24T21:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(23 * HOUR);
  });

  it('fall-back day lasts 25 hours', () => {
    const { start, end } = localDayBounds('2026-10-29', CAIRO);
    expect(start.toISOString()).toBe('2026-10-28T21:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-29T22:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(25 * HOUR);
  });

  it('consecutive days tile without gaps across DST changes', () => {
    for (let day = '2026-04-20'; day <= '2026-05-01'; day = addDays(day, 1)) {
      expect(localDayBounds(day, CAIRO).end.getTime()).toBe(
        localDayBounds(addDays(day, 1), CAIRO).start.getTime(),
      );
    }
  });

  it('places instants near midnight on the Cairo day, not the UTC day', () => {
    expect(localDayOf(new Date('2026-11-16T22:30:00Z'), CAIRO)).toBe(
      '2026-11-17',
    );
    expect(localDayOf(new Date('2026-11-16T21:59:00Z'), CAIRO)).toBe(
      '2026-11-16',
    );
    // Last hour of the 25-hour day is still Oct 29.
    expect(localDayOf(new Date('2026-10-29T21:30:00Z'), CAIRO)).toBe(
      '2026-10-29',
    );
  });

  it('does calendar arithmetic and validation', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysInRange('2026-01-01', '2026-12-31')).toBe(365);
    expect(daysInRange('2026-11-17', '2026-11-17')).toBe(1);
    expect(daysInRange('2026-11-18', '2026-11-17')).toBe(0);
    expect(weekdayOf('2026-11-17')).toBe(2); // Tuesday
    expect(isLocalDay('2026-02-29')).toBe(false);
    expect(isLocalDay('2028-02-29')).toBe(true);
    expect(isLocalDay('2026-1-01')).toBe(false);
    expect(dbDateToDay(dayToDbDate('2026-11-17'))).toBe('2026-11-17');
  });
});
