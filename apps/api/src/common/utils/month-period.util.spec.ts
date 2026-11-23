import {
  daysInMonth,
  monthBounds,
  parsePeriod,
  periodOf,
  periodRange,
  shiftPeriod,
} from './month-period.util';

const CAIRO = 'Africa/Cairo';

describe('month-period util', () => {
  it('bounds a winter month between Cairo midnights (UTC+2)', () => {
    const { start, end } = monthBounds('2026-11', CAIRO);
    expect(start.toISOString()).toBe('2026-10-31T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-30T22:00:00.000Z');
  });

  it('bounds a summer month between Cairo midnights (UTC+3, DST)', () => {
    const { start, end } = monthBounds('2026-07', CAIRO);
    expect(start.toISOString()).toBe('2026-06-30T21:00:00.000Z');
    expect(end.toISOString()).toBe('2026-07-31T21:00:00.000Z');
  });

  it('crosses the DST change inside October', () => {
    // October starts in summer time and ends in winter time.
    const { start, end } = monthBounds('2026-10', CAIRO);
    expect(start.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T22:00:00.000Z');
  });

  it('places late-evening UTC instants in the next Cairo month', () => {
    // 22:30 UTC on Oct 31 is 00:30 on Nov 1 in Cairo.
    expect(periodOf(new Date('2026-10-31T22:30:00Z'), CAIRO)).toBe('2026-11');
    expect(periodOf(new Date('2026-10-31T21:59:00Z'), CAIRO)).toBe('2026-10');
    expect(periodOf(new Date('2026-10-31T22:30:00Z'), 'UTC')).toBe('2026-10');
  });

  it('shifts across years', () => {
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
    expect(shiftPeriod('2026-11', 3)).toBe('2027-02');
    expect(shiftPeriod('2026-11', -12)).toBe('2025-11');
  });

  it('lists every month of a range', () => {
    expect(periodRange('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
    expect(periodRange('2026-03', '2026-02')).toEqual([]);
  });

  it('validates and measures periods', () => {
    expect(parsePeriod('2026-02')).toEqual({ year: 2026, month: 2 });
    expect(() => parsePeriod('2026-13')).toThrow();
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-11')).toBe(30);
  });
});
