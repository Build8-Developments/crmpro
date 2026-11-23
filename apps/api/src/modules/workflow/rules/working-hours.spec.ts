import {
  DEFAULT_WORK_SCHEDULE,
  addWorkingMinutes,
  isWorkingTime,
  nextWorkingStart,
  workingMinutesBetween,
} from '@crmpro/shared/workflow';

// Cairo is UTC+2 in November (no DST). Sat–Thu, 10:00–19:00.
const cairo = (iso: string) => new Date(`${iso}+02:00`);

describe('working hours (Cairo, Sat–Thu 10:00–19:00)', () => {
  const schedule = DEFAULT_WORK_SCHEDULE;

  it('knows working time', () => {
    expect(isWorkingTime(cairo('2026-11-17T11:00:00'), schedule)).toBe(true); // Tue
    expect(isWorkingTime(cairo('2026-11-17T19:00:00'), schedule)).toBe(false);
    expect(isWorkingTime(cairo('2026-11-20T12:00:00'), schedule)).toBe(false); // Fri
  });

  it('adds minutes inside the same window', () => {
    expect(
      addWorkingMinutes(cairo('2026-11-17T11:00:00'), 15, schedule),
    ).toEqual(cairo('2026-11-17T11:15:00'));
  });

  it('starts the clock at opening time for a lead assigned at night', () => {
    expect(
      addWorkingMinutes(cairo('2026-11-17T23:00:00'), 15, schedule),
    ).toEqual(cairo('2026-11-18T10:15:00'));
  });

  it('carries the remainder over the weekend (Thursday evening → Saturday)', () => {
    expect(
      addWorkingMinutes(cairo('2026-11-19T18:50:00'), 30, schedule),
    ).toEqual(cairo('2026-11-21T10:20:00'));
  });

  it('finds the next opening time', () => {
    expect(nextWorkingStart(cairo('2026-11-20T09:00:00'), schedule)).toEqual(
      cairo('2026-11-21T10:00:00'),
    );
    const open = cairo('2026-11-17T12:34:00');
    expect(nextWorkingStart(open, schedule)).toBe(open);
  });

  it('counts only working minutes between two moments', () => {
    expect(
      workingMinutesBetween(
        cairo('2026-11-19T18:30:00'),
        cairo('2026-11-21T10:30:00'),
        schedule,
      ),
    ).toBe(60);
  });

  it('treats an empty schedule as always open', () => {
    const always = { ...schedule, workingDays: [] };
    expect(addWorkingMinutes(cairo('2026-11-20T03:00:00'), 15, always)).toEqual(
      cairo('2026-11-20T03:15:00'),
    );
  });
});
