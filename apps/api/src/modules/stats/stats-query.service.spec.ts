import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import type { LeadScope } from '../../common/auth';
import { StatsQueryService } from './stats-query.service';

const USER = {
  id: 'agent-1',
  tenantId: 'tenant-1',
  roleId: 'role',
  sessionId: 's',
};
// Tuesday 2026-11-17, 12:00 Cairo.
const NOW = new Date('2026-11-17T10:00:00Z');

function row(day: string, userId: string, patch: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant-1',
    userId,
    day: new Date(`${day}T00:00:00.000Z`),
    interactions: 0,
    calls: 0,
    whatsapps: 0,
    meetings: 0,
    visits: 0,
    answered: 0,
    tasksDue: 0,
    tasksDone: 0,
    tasksOverdue: 0,
    tasksSnoozed: 0,
    slaHits: 0,
    slaMisses: 0,
    firstResponseCount: 0,
    firstResponseMinutesTotal: 0,
    dealsReserved: 0,
    dealsContracted: 0,
    dealsCancelled: 0,
    revenue: new Prisma.Decimal(0),
    commission: new Prisma.Decimal(0),
    computedAt: new Date('2026-11-17T09:55:00Z'),
    ...patch,
  };
}

function build() {
  const prisma = {
    userDailyStat: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: {} }),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    team: { findFirst: jest.fn() },
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue({ weekStartsOn: 6 }),
    },
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
  const dailyStats = { refreshToday: jest.fn().mockResolvedValue(true) };
  const service = new StatsQueryService(
    prisma as never,
    clock as never,
    dailyStats as never,
  );
  return { service, prisma, dailyStats };
}

const own: LeadScope = { kind: 'own', actorUserId: 'agent-1' };
const team: LeadScope = {
  kind: 'team',
  actorUserId: 'lead-1',
  userIds: ['lead-1', 'agent-1'],
};
const all: LeadScope = { kind: 'all', actorUserId: 'owner' };

function whereOf(prisma: ReturnType<typeof build>['prisma']) {
  return (
    prisma.userDailyStat.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    }
  ).where;
}

describe('StatsQueryService.getDaily — scope', () => {
  it('an agent without team/all scope only sees themselves', async () => {
    const { service, prisma } = build();

    await service.getDaily(USER, own, {}, NOW);

    expect(whereOf(prisma)).toEqual({
      tenantId: 'tenant-1',
      day: {
        gte: new Date('2026-10-19T00:00:00.000Z'),
        lte: new Date('2026-11-17T00:00:00.000Z'),
      },
      userId: { in: ['agent-1'] },
    });
  });

  it('refuses another user outside the scope', async () => {
    const { service, prisma } = build();

    await expect(
      service.getDaily(USER, own, { userId: 'agent-9' }, NOW),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getDaily(USER, team, { userId: 'agent-9' }, NOW),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userDailyStat.findMany).not.toHaveBeenCalled();
  });

  it('team scope sees its team; a team filter is intersected with the scope', async () => {
    const { service, prisma } = build();
    prisma.team.findFirst.mockResolvedValue({ id: 'team-2' });
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'agent-1' },
      { id: 'agent-7' },
    ]);

    await service.getDaily(USER, team, { teamId: 'team-2' }, NOW);

    expect(prisma.team.findFirst).toHaveBeenCalledWith({
      where: { id: 'team-2', tenantId: 'tenant-1', deletedAt: null },
      select: { id: true },
    });
    expect(whereOf(prisma).userId).toEqual({ in: ['agent-1'] });
  });

  it('read-all sees everyone, and a team filter narrows to its members', async () => {
    const { service, prisma } = build();

    await service.getDaily(USER, all, {}, NOW);
    expect(whereOf(prisma).userId).toBeUndefined();

    prisma.userDailyStat.findMany.mockClear();
    prisma.team.findFirst.mockResolvedValue({ id: 'team-2' });
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'agent-7' }]);
    await service.getDaily(USER, all, { teamId: 'team-2' }, NOW);
    expect(whereOf(prisma).userId).toEqual({ in: ['agent-7'] });
  });

  it('returns no rows without querying when the intersection is empty', async () => {
    const { service, prisma } = build();
    prisma.team.findFirst.mockResolvedValue({ id: 'team-2' });
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'agent-7' }]);

    const result = await service.getDaily(USER, own, { teamId: 'team-2' }, NOW);

    expect(result.rows).toEqual([]);
    expect(prisma.userDailyStat.findMany).not.toHaveBeenCalled();
  });
});

describe('StatsQueryService.getDaily — range and totals', () => {
  it('rejects inverted, impossible and over-long ranges', async () => {
    const { service } = build();
    await expect(
      service.getDaily(USER, all, { from: '2026-11-10', to: '2026-11-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getDaily(USER, all, { from: '2026-02-30', to: '2026-03-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getDaily(USER, all, { from: '2025-11-16', to: '2026-11-17' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getDaily(USER, all, { from: '2025-11-17', to: '2026-11-17' }),
    ).resolves.toBeDefined(); // exactly 366 days
  });

  it('maps rows and sums totals with averages', async () => {
    const { service, prisma } = build();
    prisma.userDailyStat.findMany.mockResolvedValue([
      row('2026-11-16', 'agent-1', {
        interactions: 10,
        slaHits: 3,
        slaMisses: 1,
        firstResponseCount: 2,
        firstResponseMinutesTotal: 25,
        revenue: new Prisma.Decimal('1000000.25'),
      }),
      row('2026-11-17', 'agent-2', {
        interactions: 5,
        revenue: new Prisma.Decimal('500000.50'),
        commission: new Prisma.Decimal('12500'),
      }),
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'agent-1', name: 'Mona', teamId: null },
      { id: 'agent-2', name: 'Omar', teamId: 'team-1' },
    ]);

    const result = await service.getDaily(
      USER,
      all,
      { from: '2026-11-16', to: '2026-11-17' },
      NOW,
    );

    expect(result.rows[0]).toMatchObject({
      day: '2026-11-16',
      userId: 'agent-1',
      interactions: 10,
      revenue: 1000000.25,
      computedAt: '2026-11-17T09:55:00.000Z',
    });
    expect(result.totals).toMatchObject({
      interactions: 15,
      revenue: 1500000.75,
      commission: 12500,
      avgFirstResponseMinutes: 12.5,
      slaHitRate: 0.75,
    });
    expect(result.users).toHaveLength(2);
  });
});

describe('StatsQueryService.getMySummary', () => {
  it('refreshes today, then returns periods and the streak', async () => {
    const { service, prisma, dailyStats } = build();
    prisma.userDailyStat.findMany.mockResolvedValue([
      row('2026-10-31', 'agent-1', { interactions: 30 }), // last month
      row('2026-11-12', 'agent-1', { tasksDue: 5, tasksDone: 2 }), // Thu: fails
      row('2026-11-14', 'agent-1', { tasksDue: 5, tasksDone: 5 }), // Sat
      row('2026-11-15', 'agent-1', { interactions: 26 }), // Sun, goal
      row('2026-11-16', 'agent-1', { tasksDue: 10, tasksDone: 8 }), // Mon
      row('2026-11-17', 'agent-1', { interactions: 4, tasksDue: 3 }), // today
    ]);
    prisma.userDailyStat.aggregate.mockResolvedValue({
      _sum: {
        interactions: 500,
        dealsContracted: 4,
        revenue: new Prisma.Decimal('9000000'),
        commission: null,
      },
    });

    const result = await service.getMySummary(USER, NOW);

    expect(dailyStats.refreshToday).toHaveBeenCalledWith(
      'tenant-1',
      'agent-1',
      NOW,
    );
    expect(prisma.userDailyStat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'agent-1',
        }),
      }),
    );
    expect(result.today).toMatchObject({
      from: '2026-11-17',
      to: '2026-11-17',
    });
    expect(result.today.totals.interactions).toBe(4);
    // Week starts Saturday (weekStartsOn = 6).
    expect(result.week.from).toBe('2026-11-14');
    expect(result.week.totals.interactions).toBe(30);
    expect(result.month.from).toBe('2026-11-01');
    expect(result.month.totals.tasksDue).toBe(23);
    expect(result.allTime.totals).toMatchObject({
      interactions: 500,
      dealsContracted: 4,
      revenue: 9000000,
      commission: 0,
      avgFirstResponseMinutes: null,
    });
    // Mon + Sun + Sat; Fri is off; Thu fails. Today (1/3 done) does not count.
    expect(result.streak.days).toBe(3);
    expect(result.todayComputedAt).toBe('2026-11-17T09:55:00.000Z');
  });

  it('still answers when the refresh fails', async () => {
    const { service, dailyStats } = build();
    dailyStats.refreshToday.mockRejectedValue(new Error('redis down'));

    await expect(service.getMySummary(USER, NOW)).resolves.toMatchObject({
      streak: { days: 0 },
      todayComputedAt: null,
    });
  });
});
