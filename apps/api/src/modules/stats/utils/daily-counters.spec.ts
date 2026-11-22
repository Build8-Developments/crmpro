import { InteractionChannel, InteractionOutcome } from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import {
  addInteractionGroup,
  classifySla,
  computeStreak,
  emptyCounters,
  firstResponseMinutes,
  isAllZero,
  type SlaContext,
} from './daily-counters';
import { localDayBounds } from './local-day.util';

// Tuesday 2026-11-17 in Cairo; working hours Sat–Thu 10:00–19:00 (UTC+2).
const day = localDayBounds('2026-11-17', 'Africa/Cairo');
const ctx: SlaContext = {
  dayStart: day.start,
  dayEnd: day.end,
  now: new Date('2026-11-18T08:00:00Z'),
  firstContactSlaMinutes: 15,
  schedule: DEFAULT_WORK_SCHEDULE,
};
const at = (iso: string) => new Date(iso);

describe('addInteractionGroup', () => {
  it('maps channels and outcomes to counters, visits counted once', () => {
    const c = emptyCounters();
    const add = (
      channel: InteractionChannel,
      outcome: InteractionOutcome,
      count: number,
    ) => addInteractionGroup(c, { channel, outcome, count });

    add(InteractionChannel.CALL, InteractionOutcome.NO_ANSWER, 3);
    add(InteractionChannel.CALL, InteractionOutcome.ANSWERED_INTERESTED, 2);
    add(InteractionChannel.VIDEO_CALL, InteractionOutcome.OFFER_SENT, 1);
    add(InteractionChannel.WHATSAPP, InteractionOutcome.CALLBACK_REQUESTED, 1);
    add(InteractionChannel.MEETING, InteractionOutcome.VISIT_BOOKED, 1);
    add(InteractionChannel.SITE_VISIT, InteractionOutcome.VISIT_DONE, 1);
    add(InteractionChannel.CALL, InteractionOutcome.VISIT_DONE, 1);
    add(InteractionChannel.SITE_VISIT, InteractionOutcome.NO_ANSWER, 1);
    add(InteractionChannel.EMAIL, InteractionOutcome.BUSY, 1);

    expect(c).toMatchObject({
      interactions: 12,
      calls: 7, // CALL + VIDEO_CALL
      whatsapps: 1,
      meetings: 1,
      visits: 3, // 2 SITE_VISIT + 1 VISIT_DONE by phone, no double count
      answered: 7,
    });
  });
});

describe('isAllZero', () => {
  it('is false as soon as any counter or money is set', () => {
    const c = emptyCounters();
    expect(isAllZero(c)).toBe(true);
    c.revenue = c.revenue.add(1);
    expect(isAllZero(c)).toBe(false);
  });
});

describe('classifySla', () => {
  const lead = (patch: Partial<Parameters<typeof classifySla>[0]>) => ({
    assignedAt: at('2026-11-17T08:00:00Z'), // 10:00 Cairo → due 10:15
    firstContactedAt: null,
    slaBreachedAt: null,
    closedAt: null,
    ...patch,
  });

  it('hit when first contact is on time', () => {
    expect(
      classifySla(lead({ firstContactedAt: at('2026-11-17T08:15:00Z') }), ctx),
    ).toBe('hit');
  });

  it('miss when contacted late, breached, or never contacted', () => {
    expect(
      classifySla(lead({ firstContactedAt: at('2026-11-17T08:16:00Z') }), ctx),
    ).toBe('miss');
    expect(
      classifySla(
        lead({
          slaBreachedAt: at('2026-11-17T08:15:00Z'),
          firstContactedAt: at('2026-11-17T08:10:00Z'), // back-dated later
        }),
        ctx,
      ),
    ).toBe('miss');
    expect(classifySla(lead({}), ctx)).toBe('miss');
  });

  it('runs the clock in working hours: assigned at night, due next morning', () => {
    // Monday 20:00 Cairo → due Tuesday 10:15, which is on the day.
    const overnight = lead({ assignedAt: at('2026-11-16T18:00:00Z') });
    expect(classifySla(overnight, ctx)).toBe('miss');
    // Tuesday 22:00 Cairo → due Wednesday: another day.
    const tonight = lead({ assignedAt: at('2026-11-17T20:00:00Z') });
    expect(classifySla(tonight, ctx)).toBeNull();
  });

  it('ignores pending deadlines, leads closed before the deadline and earlier contacts', () => {
    expect(
      classifySla(lead({}), { ...ctx, now: at('2026-11-17T08:05:00Z') }),
    ).toBeNull();
    expect(
      classifySla(lead({ closedAt: at('2026-11-17T08:05:00Z') }), ctx),
    ).toBeNull();
    expect(
      classifySla(
        lead({ firstContactedAt: at('2026-11-10T08:00:00Z') }), // before assignment
        ctx,
      ),
    ).toBeNull();
  });

  it('a breach from a previous assignment does not count against the new owner', () => {
    const reassigned = lead({
      slaBreachedAt: at('2026-11-16T08:15:00Z'),
      firstContactedAt: at('2026-11-17T08:05:00Z'),
    });
    expect(classifySla(reassigned, ctx)).toBe('hit');
  });
});

describe('firstResponseMinutes', () => {
  const base = {
    assignedUserId: 'agent-1',
    firstInteractionUserId: 'agent-1',
  };

  it('counts working minutes only', () => {
    // Monday 18:00 → Tuesday 10:30 Cairo = 60 + 30 working minutes.
    expect(
      firstResponseMinutes(
        {
          ...base,
          assignedAt: at('2026-11-16T16:00:00Z'),
          firstContactedAt: at('2026-11-17T08:30:00Z'),
        },
        DEFAULT_WORK_SCHEDULE,
      ),
    ).toBe(90);
  });

  it('skips first touches by someone else or before the assignment', () => {
    const times = {
      assignedAt: at('2026-11-17T08:00:00Z'),
      firstContactedAt: at('2026-11-17T08:10:00Z'),
    };
    expect(
      firstResponseMinutes(
        { ...base, ...times, firstInteractionUserId: 'agent-2' },
        DEFAULT_WORK_SCHEDULE,
      ),
    ).toBeNull();
    expect(
      firstResponseMinutes(
        {
          ...base,
          assignedAt: at('2026-11-17T09:00:00Z'),
          firstContactedAt: at('2026-11-17T08:10:00Z'),
        },
        DEFAULT_WORK_SCHEDULE,
      ),
    ).toBeNull();
  });
});

describe('computeStreak', () => {
  const run = (
    days: Record<
      string,
      { tasksDue: number; tasksDone: number; interactions: number }
    >,
    today = '2026-11-17',
  ) =>
    computeStreak({
      today,
      days: new Map(Object.entries(days)),
      workingDays: [0, 1, 2, 3, 4, 6], // Friday off
      dailyInteractionGoal: 25,
      lookbackDays: 60,
    });

  it('counts ≥80% task days and goal days, skipping Friday and empty days', () => {
    expect(
      run({
        '2026-11-16': { tasksDue: 10, tasksDone: 8, interactions: 0 }, // Mon ok
        '2026-11-15': { tasksDue: 0, tasksDone: 0, interactions: 25 }, // Sun goal
        // Sat 14th: no row (holiday) — neutral; Fri 13th: day off
        '2026-11-12': { tasksDue: 5, tasksDone: 5, interactions: 3 }, // Thu ok
        '2026-11-11': { tasksDue: 10, tasksDone: 7, interactions: 40 }, // Wed fails
        '2026-11-10': { tasksDue: 1, tasksDone: 1, interactions: 1 },
      }),
    ).toBe(3);
  });

  it('today only adds, never breaks', () => {
    const history = {
      '2026-11-16': { tasksDue: 4, tasksDone: 4, interactions: 0 },
    };
    expect(
      run({
        ...history,
        '2026-11-17': { tasksDue: 10, tasksDone: 1, interactions: 2 },
      }),
    ).toBe(1);
    expect(
      run({
        ...history,
        '2026-11-17': { tasksDue: 10, tasksDone: 9, interactions: 2 },
      }),
    ).toBe(2);
  });

  it('a working day with a row but nothing due and below goal breaks it', () => {
    expect(
      run({
        '2026-11-16': { tasksDue: 0, tasksDone: 0, interactions: 3 },
        '2026-11-15': { tasksDue: 2, tasksDone: 2, interactions: 0 },
      }),
    ).toBe(0);
  });
});
