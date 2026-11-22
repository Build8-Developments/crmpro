import { DailyStatsJobService, finalPasses } from './daily-stats-job.service';

const TENANT = { id: 'tenant-1', createdAt: new Date('2025-01-01T00:00:00Z') };
// 2026-11-17 00:20 in Cairo (UTC+2): yesterday (Nov 16) has just ended.
const NOW = new Date('2026-11-16T22:20:00Z');

function build() {
  const cacheStore = new Map<string, unknown>();
  const claims = new Set<string>();
  const releases: string[] = [];
  const prisma = {
    tenant: { findMany: jest.fn().mockResolvedValue([TENANT]) },
    userDailyStat: {
      aggregate: jest.fn().mockResolvedValue({ _max: { computedAt: null } }),
      findFirst: jest.fn().mockResolvedValue({ day: new Date() }),
    },
  };
  const stats = {
    computeDay: jest
      .fn()
      .mockResolvedValue({ day: '', written: 0, removed: 0 }),
  };
  const clock = { getTimeZone: jest.fn().mockResolvedValue('Africa/Cairo') };
  const scheduler = {
    register: jest.fn(),
    claim: jest.fn((key: string) => {
      if (claims.has(key)) return Promise.resolve(null);
      claims.add(key);
      return Promise.resolve({
        release: jest.fn(() => {
          claims.delete(key);
          releases.push(key);
          return Promise.resolve();
        }),
      });
    }),
  };
  const cache = {
    get: jest.fn((key: string) => Promise.resolve(cacheStore.get(key) ?? null)),
    set: jest.fn((key: string, value: unknown) => {
      cacheStore.set(key, value);
      return Promise.resolve();
    }),
  };
  const tenantAccess = {
    assertTenantAccessible: jest.fn().mockResolvedValue(undefined),
  };
  const achievements = {
    evaluateActiveToday: jest
      .fn()
      .mockResolvedValue({ users: 0, written: 0, notified: 0 }),
  };
  const job = new DailyStatsJobService(
    prisma as never,
    stats as never,
    clock as never,
    scheduler as never,
    cache as never,
    tenantAccess as never,
    achievements as never,
  );
  const computedDays = () =>
    stats.computeDay.mock.calls.map(([, day]) => day as string);
  return {
    job,
    prisma,
    stats,
    scheduler,
    cache,
    cacheStore,
    claims,
    releases,
    tenantAccess,
    achievements,
    computedDays,
  };
}

describe('finalPasses', () => {
  it('finalizes yesterday at its end and the settle day after the back-dating window', () => {
    expect(finalPasses('2026-11-17', 'Africa/Cairo')).toEqual([
      { day: '2026-11-16', finalAt: new Date('2026-11-16T22:00:00Z') },
      // Nov 14 ends 2026-11-14T22:00Z, + 48h.
      { day: '2026-11-14', finalAt: new Date('2026-11-16T22:00:00Z') },
    ]);
  });
});

describe('DailyStatsJobService', () => {
  it('registers the 15-minute job', () => {
    const { job, scheduler } = build();
    job.onModuleInit();
    expect(scheduler.register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'daily-stats', everyMs: 900_000 }),
    );
  });

  it('computes yesterday, the settle day and today on the first tick after midnight', async () => {
    const { job, computedDays, releases } = build();

    const result = await job.runTenant(TENANT, NOW);

    expect(result).toEqual({
      finalized: ['2026-11-16', '2026-11-14'],
      today: true,
      backfilled: 0,
    });
    expect(computedDays()).toEqual(['2026-11-16', '2026-11-14', '2026-11-17']);
    // Today's claim is released; final claims are kept (claim-once).
    expect(releases).toEqual(['stats:daily:pass:tenant-1:2026-11-17']);
  });

  it('evaluates badges after refreshing today, only on the instance that refreshed it', async () => {
    const { job, achievements, claims } = build();

    await job.runTenant(TENANT, NOW);
    expect(achievements.evaluateActiveToday).toHaveBeenCalledWith(
      'tenant-1',
      '2026-11-17',
      NOW,
    );

    // Another instance holds today's pass: no refresh, no badges.
    achievements.evaluateActiveToday.mockClear();
    claims.add('stats:daily:pass:tenant-1:2026-11-17');
    const result = await job.runTenant(TENANT, NOW);
    expect(result.today).toBe(false);
    expect(achievements.evaluateActiveToday).not.toHaveBeenCalled();
  });

  it('claim-once: a second tick or instance does not redo the final passes', async () => {
    const { job, computedDays } = build();

    await job.runTenant(TENANT, NOW);
    await job.runTenant(TENANT, new Date(NOW.getTime() + 15 * 60_000));

    expect(computedDays()).toEqual([
      '2026-11-16',
      '2026-11-14',
      '2026-11-17',
      '2026-11-17', // today is always refreshed
    ]);
  });

  it('skips a final pass when stored rows were computed after the day ended', async () => {
    const { job, prisma, computedDays, scheduler } = build();
    prisma.userDailyStat.aggregate.mockResolvedValue({
      _max: { computedAt: new Date('2026-11-16T22:05:00Z') },
    });

    await job.runTenant(TENANT, NOW);

    expect(computedDays()).toEqual(['2026-11-17']);
    expect(scheduler.claim).toHaveBeenCalledTimes(1);
  });

  it('recomputes yesterday when it was last computed before it ended', async () => {
    const { job, prisma, computedDays } = build();
    prisma.userDailyStat.aggregate.mockResolvedValue({
      _max: { computedAt: new Date('2026-11-16T21:45:00Z') },
    });

    await job.runTenant(TENANT, NOW);

    expect(computedDays()).toContain('2026-11-16');
  });

  it('skips today while another instance is computing it', async () => {
    const { job, claims, computedDays } = build();
    claims.add('stats:daily:pass:tenant-1:2026-11-17');

    const result = await job.runTenant(TENANT, NOW);

    expect(result.today).toBe(false);
    expect(computedDays()).not.toContain('2026-11-17');
  });

  it('releases a final claim when the computation fails, so the next tick retries', async () => {
    const { job, stats, claims } = build();
    stats.computeDay.mockRejectedValueOnce(new Error('db down'));

    await expect(job.runTenant(TENANT, NOW)).rejects.toThrow('db down');
    expect(
      [...claims].some((key) => key.startsWith('stats:daily:final:')),
    ).toBe(false);
  });

  it('starts a 90-day backfill for a tenant with no rows and runs it in batches', async () => {
    const { job, prisma, cacheStore, computedDays } = build();
    prisma.userDailyStat.findFirst.mockResolvedValue(null);

    const first = await job.runTenant(TENANT, NOW);

    expect(first.backfilled).toBe(10);
    // 2026-11-15 back to 2026-11-06, after yesterday / settle / today.
    expect(computedDays().slice(3)).toEqual([
      '2026-11-15',
      '2026-11-14',
      '2026-11-13',
      '2026-11-12',
      '2026-11-11',
      '2026-11-10',
      '2026-11-09',
      '2026-11-08',
      '2026-11-07',
      '2026-11-06',
    ]);
    expect(cacheStore.get('stats:daily:backfill:tenant-1')).toEqual({
      cursor: '2026-11-05',
      until: '2026-08-19',
    });

    // The cursor resumes on the next ticks until the window is covered.
    let ticks = 1;
    while (
      (cacheStore.get('stats:daily:backfill:tenant-1') as { done?: boolean })
        .done !== true
    ) {
      await job.runTenant(TENANT, NOW);
      ticks += 1;
    }
    const backfilledDays = new Set(
      computedDays().filter((day) => day <= '2026-11-15'),
    );
    expect(backfilledDays.has('2026-08-19')).toBe(true);
    expect(backfilledDays.has('2026-08-18')).toBe(false);
    expect(ticks).toBe(9);
  });

  it('never backfills before the tenant existed', async () => {
    const { job, prisma, cacheStore } = build();
    prisma.userDailyStat.findFirst.mockResolvedValue(null);

    await job.runTenant(
      { id: 'tenant-1', createdAt: new Date('2026-11-16T09:00:00Z') },
      NOW,
    );

    expect(cacheStore.get('stats:daily:backfill:tenant-1')).toEqual({
      done: true,
    });
  });

  it('skips inactive tenants and keeps going when one tenant fails', async () => {
    const { job, prisma, tenantAccess, stats } = build();
    prisma.tenant.findMany.mockResolvedValue([
      { id: 'lapsed', createdAt: TENANT.createdAt },
      { id: 'broken', createdAt: TENANT.createdAt },
      TENANT,
    ]);
    tenantAccess.assertTenantAccessible.mockImplementation((id: string) =>
      id === 'lapsed' ? Promise.reject(new Error('inactive')) : undefined,
    );
    stats.computeDay.mockImplementation((tenantId: string) =>
      tenantId === 'broken'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ day: '', written: 0, removed: 0 }),
    );

    await job.runTick(NOW);

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: { in: expect.arrayContaining(['ACTIVE', 'TRIAL']) },
      },
      select: { id: true, createdAt: true },
    });
    const tenants = stats.computeDay.mock.calls.map(([tenantId]) => tenantId);
    expect(tenants).not.toContain('lapsed');
    expect(tenants).toContain('tenant-1');
  });
});
