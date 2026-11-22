import { isReferralSourceName } from '@crmpro/shared/achievements';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import { computeStreak, type StreakDay } from '../utils/daily-counters';
import {
  bestStreakTimeline,
  buildTimelines,
  cleanWeeksTimeline,
  type DayFact,
  type DealFact,
  isFastFirstContact,
  referralTimeline,
  weekStartOf,
  winRateTimeline,
} from './achievement-sources';
import { readAt } from './achievement-timeline';

const TZ = 'Africa/Cairo';
// Wednesday 2026-11-18, 14:00 Cairo.
const NOW = new Date('2026-11-18T12:00:00Z');
const TODAY = '2026-11-18';
const CALENDAR = {
  timeZone: TZ,
  weekStartsOn: 6, // Saturday
  schedule: DEFAULT_WORK_SCHEDULE, // Sat–Thu, 10:00–19:00
  dailyInteractionGoal: 25,
};

function day(dayKey: string, patch: Partial<DayFact> = {}): DayFact {
  return {
    day: dayKey,
    tasksDue: 0,
    tasksDone: 0,
    tasksOverdue: 0,
    interactions: 0,
    ...patch,
  };
}

function deal(patch: Partial<DealFact> = {}): DealFact {
  return {
    reservedAt: new Date('2026-11-01T10:00:00Z'),
    contractedAt: null,
    price: 1_000_000,
    commission: 0,
    sourceName: null,
    ...patch,
  };
}

describe('isFastFirstContact', () => {
  const at = (iso: string) => new Date(iso);

  it('counts a first contact within 5 working minutes of assignment', () => {
    // Assigned Tue 11:00 Cairo, called 11:04.
    expect(
      isFastFirstContact(
        {
          assignedAt: at('2026-11-17T09:00:00Z'),
          firstContactedAt: at('2026-11-17T09:04:00Z'),
        },
        DEFAULT_WORK_SCHEDULE,
      ),
    ).toBe(true);
    expect(
      isFastFirstContact(
        {
          assignedAt: at('2026-11-17T09:00:00Z'),
          firstContactedAt: at('2026-11-17T09:06:00Z'),
        },
        DEFAULT_WORK_SCHEDULE,
      ),
    ).toBe(false);
  });

  it('only runs the clock in working hours (assigned at night, called at opening)', () => {
    // Assigned Mon 23:00 Cairo, called Tue 10:03.
    expect(
      isFastFirstContact(
        {
          assignedAt: at('2026-11-16T21:00:00Z'),
          firstContactedAt: at('2026-11-17T08:03:00Z'),
        },
        DEFAULT_WORK_SCHEDULE,
      ),
    ).toBe(true);
  });

  it('ignores leads touched before the current assignment', () => {
    expect(
      isFastFirstContact(
        {
          assignedAt: at('2026-11-17T09:00:00Z'),
          firstContactedAt: at('2026-11-10T09:00:00Z'),
        },
        DEFAULT_WORK_SCHEDULE,
      ),
    ).toBe(false);
  });
});

describe('referral magnet', () => {
  it('detects referral sources by name, case-insensitively', () => {
    expect(isReferralSourceName('Referral')).toBe(true);
    expect(isReferralSourceName('Client REFERRAL program')).toBe(true);
    expect(isReferralSourceName('Referred by a friend')).toBe(true);
    expect(isReferralSourceName('Preferred partners')).toBe(false);
    expect(isReferralSourceName('Facebook Ads')).toBe(false);
    expect(isReferralSourceName(null)).toBe(false);
  });

  it('counts deals on referral leads only', () => {
    const timeline = referralTimeline([
      deal({ sourceName: 'Referral' }),
      deal({ sourceName: 'Website' }),
      deal({ sourceName: 'referral' }),
    ]);
    expect(readAt(timeline, NOW).value).toBe(2);
  });
});

describe('closer (win rate)', () => {
  it('uses closed won/lost leads; open leads do not count', () => {
    const closedAt = new Date('2026-11-10T10:00:00Z');
    const timeline = winRateTimeline([
      { assignedAt: null, firstContactedAt: null, closedAt, closeType: 'WON' },
      { assignedAt: null, firstContactedAt: null, closedAt, closeType: 'LOST' },
      { assignedAt: null, firstContactedAt: null, closedAt, closeType: 'LOST' },
      {
        assignedAt: null,
        firstContactedAt: null,
        closedAt: null,
        closeType: null,
      },
    ]);
    expect(readAt(timeline, NOW)).toEqual({ value: 33.3, sample: 3 });
  });
});

describe('cleanWeeksTimeline', () => {
  it('counts complete weeks with tasks due and nothing overdue', () => {
    expect(weekStartOf('2026-11-18', 6)).toBe('2026-11-14');

    const timeline = cleanWeeksTimeline(
      [
        // Week of Oct 31: clean.
        day('2026-11-01', { tasksDue: 4, tasksDone: 4 }),
        day('2026-11-03', { tasksDue: 2, tasksDone: 2 }),
        // Week of Nov 7: one day ended with an overdue task.
        day('2026-11-08', { tasksDue: 3, tasksDone: 2, tasksOverdue: 1 }),
        // Week of Nov 14 (current): clean so far, but not over.
        day('2026-11-15', { tasksDue: 5, tasksDone: 5 }),
        // Week of Oct 24: nothing due — doesn't count.
        day('2026-10-26', { interactions: 30 }),
      ],
      CALENDAR,
      NOW,
    );

    expect(readAt(timeline, NOW).value).toBe(1);
    // Counted when that week ended (Fri Nov 6, midnight Cairo).
    expect(timeline.kind === 'cumulative' && timeline.events[0].at).toEqual(
      new Date('2026-11-06T22:00:00Z'),
    );
  });
});

describe('bestStreakTimeline', () => {
  const good: Partial<DayFact> = { tasksDue: 5, tasksDone: 4 };
  const bad: Partial<DayFact> = { tasksDue: 5, tasksDone: 1 };

  it('tracks the longest streak ever with the Today streak rule', () => {
    const days = [
      // Sat Nov 7 … Tue Nov 10: 4 good working days (Fri Nov 13 is off).
      day('2026-11-07', good),
      day('2026-11-08', good),
      day('2026-11-09', good),
      day('2026-11-10', good),
      day('2026-11-11', bad),
      // Nov 12 good, Fri 13 off (no row), Sat 14 good, Sun 15 no row
      // (leave: neither counts nor breaks), Mon 16 good, Tue 17 good.
      day('2026-11-12', good),
      day('2026-11-14', { interactions: 26 }),
      day('2026-11-16', good),
      day('2026-11-17', good),
      // Today not qualifying yet: doesn't break.
      day('2026-11-18', bad),
    ];

    const timeline = bestStreakTimeline(days, CALENDAR, TODAY, NOW);

    expect(readAt(timeline, NOW).value).toBe(4);
    // The record of 4 was set on Nov 10 (and only tied after).
    expect(readAt(timeline, new Date('2026-11-10T21:00:00Z')).value).toBe(3);
    expect(readAt(timeline, new Date('2026-11-10T22:00:00Z')).value).toBe(4);

    // The current run matches the Today screen's streak.
    const map = new Map<string, StreakDay>(days.map((row) => [row.day, row]));
    expect(
      computeStreak({
        today: TODAY,
        days: map,
        workingDays: DEFAULT_WORK_SCHEDULE.workingDays,
        dailyInteractionGoal: 25,
        lookbackDays: 366,
      }),
    ).toBe(4);
  });

  it('a qualifying today extends the record, stamped now', () => {
    const days = [day('2026-11-17', good), day('2026-11-18', good)];
    const timeline = bestStreakTimeline(days, CALENDAR, TODAY, NOW);
    expect(readAt(timeline, NOW).value).toBe(2);
    expect(timeline.kind === 'cumulative' && timeline.events[1].at).toEqual(
      NOW,
    );
  });
});

describe('buildTimelines', () => {
  it('builds one timeline per catalog badge', () => {
    const timelines = buildTimelines(
      {
        deals: [
          deal({ contractedAt: new Date('2026-11-05T10:00:00Z') }),
          deal(),
        ],
        leads: [],
        days: [],
        calendar: CALENDAR,
      },
      TODAY,
      NOW,
    );
    expect(Object.keys(timelines).sort()).toEqual([
      'closer',
      'deals',
      'referral_magnet',
      'revenue',
      'speed_demon',
      'streak',
      'zero_overdue_week',
    ]);
    expect(readAt(timelines.deals, NOW).value).toBe(2);
    expect(readAt(timelines.revenue, NOW).value).toBe(1_000_000);
  });
});
