import { NotificationType, Prisma } from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import { NotificationTemplateService } from '../../notifications/notification-template.service';
import { AchievementsService } from './achievements.service';

const TENANT = 'tenant-1';
const USER = 'agent-1';
// Wednesday 2026-11-18, 14:00 Cairo.
const NOW = new Date('2026-11-18T12:00:00Z');
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000);

function dealRow(reservedAt: Date) {
  return {
    reservedAt,
    contractedAt: null,
    price: new Prisma.Decimal(1_000_000),
    commissionAmount: null,
    lead: { source: { name: 'Website' } },
  };
}

function build() {
  const prisma = {
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue({ weekStartsOn: 6 }),
    },
    deal: { findMany: jest.fn().mockResolvedValue([]) },
    lead: { findMany: jest.fn().mockResolvedValue([]) },
    userDailyStat: { findMany: jest.fn().mockResolvedValue([]) },
    userAchievement: {
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest
        .fn()
        .mockImplementation(({ data }: { data: unknown[] }) =>
          Promise.resolve({ count: data.length }),
        ),
    },
  };
  const clock = {
    getWorkflowSettings: jest.fn().mockResolvedValue({
      schedule: DEFAULT_WORK_SCHEDULE,
      firstContactSlaMinutes: 15,
      escalateAfterMinutes: 30,
      dailyInteractionGoal: 25,
    }),
  };
  const notifications = { trigger: jest.fn().mockResolvedValue(undefined) };
  const service = new AchievementsService(
    prisma as never,
    clock as never,
    notifications as never,
  );
  return { service, prisma, notifications };
}

describe('AchievementsService.evaluateUser', () => {
  it('first run on old history: writes every reached level silently', async () => {
    const { service, prisma, notifications } = build();
    // 12 deals, all older than 48 hours.
    prisma.deal.findMany.mockResolvedValue(
      Array.from({ length: 12 }, (_, index) => dealRow(hoursAgo(72 + index))),
    );

    const result = await service.evaluateUser(TENANT, USER, NOW);

    expect(prisma.userAchievement.createMany).toHaveBeenCalledTimes(1);
    const { data, skipDuplicates } =
      prisma.userAchievement.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(
      data.map(
        (row: { key: string; level: number }) => `${row.key}:${row.level}`,
      ),
    ).toEqual(['deals:1', 'deals:2', 'deals:3']);
    expect(data[0]).toMatchObject({
      tenantId: TENANT,
      userId: USER,
      // The first deal (oldest) unlocked level 1.
      unlockedAt: hoursAgo(83),
    });
    expect(notifications.trigger).not.toHaveBeenCalled();
    expect(result).toMatchObject({ written: 3, notified: 0 });
  });

  it('a level crossed recently is announced once, for the highest new level', async () => {
    const { service, prisma, notifications } = build();
    // 4 old deals, the 5th an hour ago → "5 deals" (level 2) is news;
    // "First deal" (level 1) is stored silently with it.
    prisma.deal.findMany.mockResolvedValue([
      ...Array.from({ length: 4 }, (_, index) =>
        dealRow(hoursAgo(100 + index)),
      ),
      dealRow(hoursAgo(1)),
    ]);

    const result = await service.evaluateUser(TENANT, USER, NOW);

    expect(notifications.trigger).toHaveBeenCalledTimes(1);
    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT,
        recipientUserId: USER,
        type: 'ACHIEVEMENT',
        metadata: expect.objectContaining({
          badgeKey: 'deals',
          level: 2,
          levelLabel: '5 deals',
          href: '/performance',
        }),
        dedupeKey: `achievement:deals-2:ACHIEVEMENT:${USER}`,
      }),
    );
    const deals = result?.badges.find(
      (badge) => badge.definition.key === 'deals',
    );
    expect([...(deals?.unlocked.keys() ?? [])]).toEqual([1, 2]);
  });

  it('leaves the announcement to a concurrent evaluation that wrote the rows first', async () => {
    const { service, prisma, notifications } = build();
    prisma.deal.findMany.mockResolvedValue([dealRow(hoursAgo(1))]);
    prisma.userAchievement.createMany.mockResolvedValue({ count: 0 });

    const result = await service.evaluateUser(TENANT, USER, NOW);

    expect(notifications.trigger).not.toHaveBeenCalled();
    expect(result).toMatchObject({ written: 0, notified: 0 });
  });

  it('does nothing when every reached level is already stored', async () => {
    const { service, prisma, notifications } = build();
    prisma.deal.findMany.mockResolvedValue([dealRow(hoursAgo(1))]);
    prisma.userAchievement.findMany.mockResolvedValue([
      {
        key: 'deals',
        level: 1,
        value: new Prisma.Decimal(1),
        unlockedAt: hoursAgo(1),
      },
    ]);

    const result = await service.evaluateUser(TENANT, USER, NOW);

    expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
    expect(notifications.trigger).not.toHaveBeenCalled();
    expect(result).toMatchObject({ written: 0, notified: 0 });
  });

  it('is best effort: a failed write still returns readings, nothing is announced', async () => {
    const { service, prisma, notifications } = build();
    prisma.deal.findMany.mockResolvedValue([dealRow(hoursAgo(1))]);
    prisma.userAchievement.createMany.mockRejectedValue(new Error('db down'));

    const result = await service.evaluateUser(TENANT, USER, NOW);

    expect(notifications.trigger).not.toHaveBeenCalled();
    const deals = result?.badges.find(
      (badge) => badge.definition.key === 'deals',
    );
    expect(deals?.reading.value).toBe(1);
    expect(deals?.unlocked.size).toBe(0);
  });

  it('never throws when loading fails', async () => {
    const { service, prisma } = build();
    prisma.deal.findMany.mockRejectedValue(new Error('boom'));
    await expect(service.evaluateUser(TENANT, USER, NOW)).resolves.toBeNull();
  });

  it('loads only live leads, non-cancelled deals and the tenant rows', async () => {
    const { service, prisma } = build();
    await service.evaluateUser(TENANT, USER, NOW);
    expect(prisma.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: TENANT,
          agentId: USER,
          status: { not: 'CANCELLED' },
          lead: { deletedAt: null },
        },
      }),
    );
    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, assignedUserId: USER, deletedAt: null },
      }),
    );
  });
});

describe('AchievementsService.evaluateActiveToday', () => {
  it('evaluates active users with a row today, one calendar load', async () => {
    const { service, prisma, notifications } = build();
    prisma.userDailyStat.findMany
      // The "who was active today" query, then each user's own rows.
      .mockResolvedValueOnce([{ userId: 'a' }, { userId: 'b' }])
      .mockResolvedValue([]);
    prisma.deal.findMany.mockResolvedValue([dealRow(hoursAgo(1))]);

    const summary = await service.evaluateActiveToday(
      TENANT,
      '2026-11-18',
      NOW,
    );

    expect(prisma.userDailyStat.findMany.mock.calls[0][0]).toEqual({
      where: {
        tenantId: TENANT,
        day: new Date('2026-11-18T00:00:00.000Z'),
        user: { isActive: true, deletedAt: null },
      },
      select: { userId: true },
    });
    expect(prisma.tenantSettings.findUnique).toHaveBeenCalledTimes(1);
    expect(summary).toEqual({ users: 2, written: 2, notified: 2 });
    expect(notifications.trigger).toHaveBeenCalledTimes(2);
  });

  it('never throws', async () => {
    const { service, prisma } = build();
    prisma.userDailyStat.findMany.mockRejectedValue(new Error('boom'));
    await expect(
      service.evaluateActiveToday(TENANT, '2026-11-18', NOW),
    ).resolves.toEqual({ users: 0, written: 0, notified: 0 });
  });
});

describe('ACHIEVEMENT notification template', () => {
  it('names the badge and the level', () => {
    expect(
      new NotificationTemplateService().buildTemplate({
        type: NotificationType.ACHIEVEMENT,
        metadata: { badgeName: 'Deal maker', levelLabel: '5 deals' },
      }),
    ).toEqual({
      title: 'Badge unlocked: Deal maker',
      message: 'You reached "5 deals". See all your badges on My performance.',
      priority: 'NORMAL',
    });
  });
});
