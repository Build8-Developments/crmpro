import {
  InteractionChannel,
  InteractionOutcome,
  Prisma,
  TaskStatus,
} from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import { DailyStatsService } from './daily-stats.service';

const TENANT = 'tenant-1';
const DAY = '2026-11-17'; // Tuesday; Cairo bounds 2026-11-16T22:00Z → 2026-11-17T22:00Z
const DAY_START = new Date('2026-11-16T22:00:00Z');
const DAY_END = new Date('2026-11-17T22:00:00Z');
const AFTER_DAY = new Date('2026-11-18T08:00:00Z');
const at = (iso: string) => new Date(iso);

interface Fixtures {
  interactions: Array<{
    userId: string;
    channel: InteractionChannel;
    outcome: InteractionOutcome;
    _count: { _all: number };
  }>;
  tasksDue: Array<{ assigneeId: string; _count: { _all: number } }>;
  tasksDone: Array<{ assigneeId: string; _count: { _all: number } }>;
  tasksOverdue: Array<{ assigneeId: string; _count: { _all: number } }>;
  snoozes: Array<{ userId: string | null; count: number }>;
  reserved: Array<{ agentId: string | null; _count: { _all: number } }>;
  contracted: Array<{
    agentId: string | null;
    _count: { _all: number };
    _sum: {
      price: Prisma.Decimal | null;
      commissionAmount: Prisma.Decimal | null;
    };
  }>;
  cancelled: Array<{ agentId: string | null; _count: { _all: number } }>;
  slaLeads: unknown[];
  firstContacts: unknown[];
  users: string[];
}

function emptyFixtures(): Fixtures {
  return {
    interactions: [],
    tasksDue: [],
    tasksDone: [],
    tasksOverdue: [],
    snoozes: [],
    reserved: [],
    contracted: [],
    cancelled: [],
    slaLeads: [],
    firstContacts: [],
    users: [],
  };
}

function fullFixtures(): Fixtures {
  const group = (
    channel: InteractionChannel,
    outcome: InteractionOutcome,
    count: number,
    userId = 'agent-1',
  ) => ({ userId, channel, outcome, _count: { _all: count } });
  return {
    interactions: [
      group(InteractionChannel.CALL, InteractionOutcome.NO_ANSWER, 3),
      group(InteractionChannel.CALL, InteractionOutcome.ANSWERED_INTERESTED, 2),
      group(InteractionChannel.VIDEO_CALL, InteractionOutcome.OFFER_SENT, 1),
      group(
        InteractionChannel.WHATSAPP,
        InteractionOutcome.CALLBACK_REQUESTED,
        1,
      ),
      group(InteractionChannel.MEETING, InteractionOutcome.VISIT_BOOKED, 1),
      group(InteractionChannel.SITE_VISIT, InteractionOutcome.VISIT_DONE, 1),
    ],
    tasksDue: [{ assigneeId: 'agent-1', _count: { _all: 4 } }],
    tasksDone: [{ assigneeId: 'agent-1', _count: { _all: 3 } }],
    tasksOverdue: [{ assigneeId: 'agent-1', _count: { _all: 2 } }],
    snoozes: [
      { userId: 'agent-1', count: 2 },
      { userId: 'ghost', count: 1 }, // not a user of this tenant
      { userId: null, count: 1 },
    ],
    reserved: [{ agentId: 'agent-2', _count: { _all: 1 } }],
    contracted: [
      {
        agentId: 'agent-2',
        _count: { _all: 2 },
        _sum: {
          price: new Prisma.Decimal('7000000'),
          commissionAmount: new Prisma.Decimal('175000.50'),
        },
      },
    ],
    cancelled: [{ agentId: 'agent-1', _count: { _all: 1 } }],
    slaLeads: [
      // 10:00 Cairo → due 10:15; contacted 10:10: hit
      {
        assignedUserId: 'agent-1',
        assignedAt: at('2026-11-17T08:00:00Z'),
        firstContactedAt: at('2026-11-17T08:10:00Z'),
        slaBreachedAt: null,
        closedAt: null,
      },
      // contacted late: miss
      {
        assignedUserId: 'agent-1',
        assignedAt: at('2026-11-17T08:00:00Z'),
        firstContactedAt: at('2026-11-17T09:00:00Z'),
        slaBreachedAt: null,
        closedAt: null,
      },
      // breach stamped by the rules engine: miss
      {
        assignedUserId: 'agent-1',
        assignedAt: at('2026-11-17T08:00:00Z'),
        firstContactedAt: null,
        slaBreachedAt: at('2026-11-17T08:15:00Z'),
        closedAt: null,
      },
      // assigned 22:00 Tuesday → due Wednesday: not this day
      {
        assignedUserId: 'agent-1',
        assignedAt: at('2026-11-17T20:00:00Z'),
        firstContactedAt: null,
        slaBreachedAt: null,
        closedAt: null,
      },
    ],
    firstContacts: [
      {
        assignedUserId: 'agent-1',
        assignedAt: at('2026-11-17T08:00:00Z'),
        firstContactedAt: at('2026-11-17T08:10:00Z'),
        interactions: [{ userId: 'agent-1' }],
      },
      // Monday 18:00 → Tuesday 10:30 Cairo: 90 working minutes
      {
        assignedUserId: 'agent-1',
        assignedAt: at('2026-11-16T16:00:00Z'),
        firstContactedAt: at('2026-11-17T08:30:00Z'),
        interactions: [{ userId: 'agent-1' }],
      },
      // reached first by a colleague: not the assignee's response
      {
        assignedUserId: 'agent-1',
        assignedAt: at('2026-11-17T08:00:00Z'),
        firstContactedAt: at('2026-11-17T08:20:00Z'),
        interactions: [{ userId: 'agent-2' }],
      },
    ],
    users: ['agent-1', 'agent-2'],
  };
}

function build(fixtures: Fixtures = fullFixtures()) {
  const state = { fixtures };
  const taskGroupBy = jest.fn((args: { where: Record<string, unknown> }) => {
    const f = state.fixtures;
    if (args.where.status === TaskStatus.DONE) return f.tasksDone;
    if (args.where.OR) return f.tasksOverdue;
    return f.tasksDue;
  });
  const dealGroupBy = jest.fn((args: { where: Record<string, unknown> }) => {
    const f = state.fixtures;
    if (args.where.reservedAt) return f.reserved;
    if (args.where.contractedAt) return f.contracted;
    return f.cancelled;
  });
  const leadFindMany = jest.fn((args: { where: Record<string, unknown> }) =>
    args.where.firstContactedAt
      ? state.fixtures.firstContacts
      : state.fixtures.slaLeads,
  );
  const prisma = {
    interaction: {
      groupBy: jest.fn(() => state.fixtures.interactions),
    },
    task: { groupBy: taskGroupBy },
    deal: { groupBy: dealGroupBy },
    lead: { findMany: leadFindMany },
    $queryRaw: jest.fn(() => state.fixtures.snoozes),
    user: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        state.fixtures.users
          .filter((id) => where.id.in.includes(id))
          .map((id) => ({ id })),
      ),
    },
    userDailyStat: {
      deleteMany: jest.fn((args: unknown) => ({ op: 'deleteMany', args })),
      upsert: jest.fn((args: unknown) => ({ op: 'upsert', args })),
    },
    $transaction: jest.fn((ops: unknown[]) =>
      Promise.resolve(
        ops.map((_, index) => (index === 0 ? { count: 1 } : { ok: true })),
      ),
    ),
  };
  const clock = {
    getTimeZone: jest.fn().mockResolvedValue('Africa/Cairo'),
    getWorkflowSettings: jest.fn().mockResolvedValue({
      schedule: DEFAULT_WORK_SCHEDULE,
      firstContactSlaMinutes: 15,
      escalateAfterMinutes: 30,
      dailyInteractionGoal: 25,
    }),
  };
  const scheduler = { claim: jest.fn() };
  const service = new DailyStatsService(
    prisma as never,
    clock as never,
    scheduler as never,
  );
  return { service, prisma, clock, scheduler, state };
}

type UpsertArgs = {
  where: { tenantId_userId_day: { userId: string; day: Date } };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

function upsertsByUser(prisma: ReturnType<typeof build>['prisma']) {
  return new Map(
    (prisma.userDailyStat.upsert.mock.calls as unknown as [UpsertArgs][]).map(
      ([args]) => [args.where.tenantId_userId_day.userId, args],
    ),
  );
}

describe('DailyStatsService.computeDay', () => {
  it('fills every counter from the grouped queries', async () => {
    const { service, prisma } = build();

    const result = await service.computeDay(TENANT, DAY, undefined, AFTER_DAY);

    expect(result).toEqual({ day: DAY, written: 2, removed: 1 });
    const rows = upsertsByUser(prisma);
    expect([...rows.keys()].sort()).toEqual(['agent-1', 'agent-2']);

    const agent1 = rows.get('agent-1')!;
    expect(agent1.where.tenantId_userId_day.day).toEqual(
      new Date('2026-11-17T00:00:00.000Z'),
    );
    expect(agent1.update).toMatchObject({
      interactions: 9,
      calls: 6,
      whatsapps: 1,
      meetings: 1,
      visits: 1,
      answered: 6,
      tasksDue: 4,
      tasksDone: 3,
      tasksOverdue: 2,
      tasksSnoozed: 2,
      slaHits: 1,
      slaMisses: 2,
      firstResponseCount: 2,
      firstResponseMinutesTotal: 100,
      dealsReserved: 0,
      dealsContracted: 0,
      dealsCancelled: 1,
      computedAt: AFTER_DAY,
    });
    expect(agent1.create).toMatchObject({
      tenantId: TENANT,
      userId: 'agent-1',
      interactions: 9,
    });

    const agent2 = rows.get('agent-2')!;
    expect(agent2.update).toMatchObject({
      interactions: 0,
      dealsReserved: 1,
      dealsContracted: 2,
    });
    expect(String(agent2.update.revenue)).toBe('7000000');
    expect(String(agent2.update.commission)).toBe('175000.5');

    // Unknown ids from activity metadata never become rows.
    expect(rows.has('ghost')).toBe(false);
  });

  it('queries the local day bounds, tenant-scoped', async () => {
    const { service, prisma } = build();

    await service.computeDay(TENANT, DAY, undefined, AFTER_DAY);

    expect(prisma.interaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: TENANT,
          userId: undefined,
          // Interactions on deleted leads don't count.
          lead: { deletedAt: null },
          occurredAt: { gte: DAY_START, lt: DAY_END },
        },
      }),
    );
    expect(prisma.task.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          dueAt: { gte: DAY_START, lt: DAY_END },
          status: { not: TaskStatus.CANCELLED },
        }),
      }),
    );
    // Past day: overdue judged at the end of the day.
    expect(prisma.task.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueAt: { lt: DAY_END },
          createdAt: { lt: DAY_END },
          OR: [{ status: TaskStatus.OPEN }, { completedAt: { gte: DAY_END } }],
        }),
      }),
    );
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('judges overdue "as of now" while the day is still running', async () => {
    const { service, prisma } = build();
    const midday = new Date('2026-11-17T10:00:00Z');

    await service.computeDay(TENANT, DAY, undefined, midday);

    expect(prisma.task.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueAt: { lt: midday },
          OR: [{ status: TaskStatus.OPEN }, { completedAt: { gte: midday } }],
        }),
      }),
    );
  });

  it('is idempotent: recomputing the same data writes the same rows', async () => {
    const { service, prisma } = build();

    await service.computeDay(TENANT, DAY, undefined, AFTER_DAY);
    const first = prisma.userDailyStat.upsert.mock.calls.map(([a]) => a);
    prisma.userDailyStat.upsert.mockClear();
    await service.computeDay(TENANT, DAY, undefined, AFTER_DAY);
    const second = prisma.userDailyStat.upsert.mock.calls.map(([a]) => a);

    expect(second).toEqual(first);
  });

  it('deletes rows that became all-zero on recompute', async () => {
    const { service, prisma, state } = build();
    await service.computeDay(TENANT, DAY, undefined, AFTER_DAY);

    // agent-2's deals moved away: only agent-1 keeps a row.
    state.fixtures = {
      ...fullFixtures(),
      reserved: [],
      contracted: [],
    };
    prisma.userDailyStat.upsert.mockClear();
    prisma.userDailyStat.deleteMany.mockClear();
    await service.computeDay(TENANT, DAY, undefined, AFTER_DAY);

    expect([...upsertsByUser(prisma).keys()]).toEqual(['agent-1']);
    expect(prisma.userDailyStat.deleteMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT,
        day: new Date('2026-11-17T00:00:00.000Z'),
        userId: { notIn: ['agent-1'] },
      },
    });
  });

  it('writes nothing but still clears the day when there is no activity', async () => {
    const { service, prisma } = build(emptyFixtures());

    const result = await service.computeDay(TENANT, DAY, undefined, AFTER_DAY);

    expect(result.written).toBe(0);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.userDailyStat.upsert).not.toHaveBeenCalled();
    expect(prisma.userDailyStat.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ userId: { notIn: [] } }),
    });
  });

  it('limits queries and deletions to the given users', async () => {
    const { service, prisma } = build();

    await service.computeDay(TENANT, DAY, ['agent-1'], AFTER_DAY);

    expect(prisma.interaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ['agent-1'] } }),
      }),
    );
    expect(prisma.deal.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ agentId: { in: ['agent-1'] } }),
      }),
    );
    expect(prisma.userDailyStat.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: { in: ['agent-1'], notIn: expect.any(Array) },
      }),
    });
  });

  it('skips future days and rejects malformed days', async () => {
    const { service, prisma } = build();

    await expect(
      service.computeDay(TENANT, '2026-11-20', undefined, AFTER_DAY),
    ).resolves.toEqual({ day: '2026-11-20', written: 0, removed: 0 });
    expect(prisma.interaction.groupBy).not.toHaveBeenCalled();
    await expect(service.computeDay(TENANT, '2026-13-01')).rejects.toThrow();
  });
});

describe('DailyStatsService.refreshToday', () => {
  it('recomputes only the caller, at most once per throttle window', async () => {
    const { service, prisma, scheduler } = build();
    scheduler.claim.mockResolvedValueOnce({ release: jest.fn() });
    scheduler.claim.mockResolvedValueOnce(null);
    const now = new Date('2026-11-17T10:00:00Z');

    await expect(service.refreshToday(TENANT, 'agent-1', now)).resolves.toBe(
      true,
    );
    await expect(service.refreshToday(TENANT, 'agent-1', now)).resolves.toBe(
      false,
    );

    expect(scheduler.claim).toHaveBeenCalledWith(
      'stats:daily:refresh:tenant-1:agent-1',
      60,
    );
    expect(prisma.interaction.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.interaction.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ['agent-1'] } }),
      }),
    );
  });
});

describe('DailyStatsService.backfillRange', () => {
  it('computes each day of the range, newest first', async () => {
    const { service } = build(emptyFixtures());
    const spy = jest.spyOn(service, 'computeDay');

    await expect(
      service.backfillRange(TENANT, '2026-11-14', '2026-11-16', AFTER_DAY),
    ).resolves.toBe(3);
    expect(spy.mock.calls.map(([, day]) => day)).toEqual([
      '2026-11-16',
      '2026-11-15',
      '2026-11-14',
    ]);
    await expect(
      service.backfillRange(TENANT, '2025-01-01', '2026-11-16'),
    ).rejects.toThrow('too long');
  });
});

describe('DailyStatsService.recomputeForDeal', () => {
  it('recomputes each local day the deal touched, for its agents only', async () => {
    const { service } = build(emptyFixtures());
    const spy = jest
      .spyOn(service, 'computeDay')
      .mockResolvedValue({ day: '', written: 0, removed: 0 });

    await service.recomputeForDeal(
      TENANT,
      [
        {
          agentId: 'agent-1',
          // 23:30 Cairo on the 15th, 10:00 Cairo on the 16th, 01:00 Cairo on the 17th.
          reservedAt: new Date('2026-11-15T21:30:00Z'),
          contractedAt: new Date('2026-11-16T08:00:00Z'),
          cancelledAt: new Date('2026-11-16T23:00:00Z'),
        },
        {
          agentId: null,
          reservedAt: new Date('2026-11-15T21:30:00Z'),
          contractedAt: null,
          cancelledAt: null,
        },
      ],
      AFTER_DAY,
    );

    expect(spy.mock.calls.map(([, day, users]) => [day, users])).toEqual([
      ['2026-11-15', ['agent-1']],
      ['2026-11-16', ['agent-1']],
      ['2026-11-17', ['agent-1']],
    ]);
  });

  it('does nothing for a deal nobody is credited with', async () => {
    const { service } = build(emptyFixtures());
    const spy = jest.spyOn(service, 'computeDay');
    await service.recomputeForDeal(TENANT, [
      {
        agentId: null,
        reservedAt: new Date(),
        contractedAt: null,
        cancelledAt: null,
      },
    ]);
    expect(spy).not.toHaveBeenCalled();
  });
});
