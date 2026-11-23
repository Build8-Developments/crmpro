import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, TargetMetric } from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import type { LeadScope } from '../../common/auth';
import { monthBounds } from '../../common/utils/month-period.util';
import { emptyMetricValues } from './target-actuals.service';
import { TARGET_AUDIT_ACTIONS } from './targets.constants';
import { TargetsService } from './targets.service';

const TENANT = 'tenant-1';
const owner = { id: 'owner-1', tenantId: TENANT, roleId: 'r', sessionId: 's' };
const ALL: LeadScope = { kind: 'all', actorUserId: owner.id };
const TEAM: LeadScope = {
  kind: 'team',
  actorUserId: 'manager-1',
  userIds: ['manager-1', 'agent-1'],
};
// Tue 17 Nov 2026, 12:00 Cairo.
const NOW = new Date('2026-11-17T10:00:00Z');

const person = (id: string, createdAt = new Date('2025-01-01')) => ({
  id,
  name: id,
  email: `${id}@x.com`,
  createdAt,
  role: { name: 'Agent' },
  team: { id: 'team-1', name: 'Sales A', deletedAt: null },
});

const decimal = (value: number) => new Prisma.Decimal(value);

describe('TargetsService', () => {
  let tx: {
    target: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let prisma: {
    tenantSettings: { findUnique: jest.Mock };
    user: { findMany: jest.Mock };
    target: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let actuals: { compute: jest.Mock };
  let audit: { createAuditLog: jest.Mock };
  let service: TargetsService;

  beforeEach(() => {
    tx = {
      target: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    prisma = {
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({
          timezone: 'Africa/Cairo',
          currency: 'EGP',
          workingDays: [0, 1, 2, 3, 4, 6],
          workdayStartMinute: 600,
          workdayEndMinute: 1140,
        }),
      },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([person('agent-1'), person('manager-1')]),
      },
      target: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    actuals = {
      compute: jest.fn().mockResolvedValue({
        byUser: new Map(),
        total: emptyMetricValues(),
      }),
    };
    audit = { createAuditLog: jest.fn() };
    service = new TargetsService(
      prisma as never,
      actuals as never,
      audit as never,
    );
  });

  describe('getGrid', () => {
    it('returns workspace and people with targets and actuals for the Cairo month', async () => {
      prisma.target.findMany.mockResolvedValue([
        {
          id: 't1',
          userId: null,
          metric: TargetMetric.DEALS,
          value: decimal(30),
        },
        {
          id: 't2',
          userId: 'agent-1',
          metric: TargetMetric.REVENUE,
          value: decimal(5_000_000),
        },
      ]);
      actuals.compute.mockResolvedValue({
        byUser: new Map([
          ['agent-1', { ...emptyMetricValues(), DEALS: 2, REVENUE: 1_000_000 }],
        ]),
        total: { ...emptyMetricValues(), DEALS: 5 },
      });

      const grid = await service.getGrid(owner, ALL, undefined, NOW);

      expect(grid.period).toBe('2026-11');
      expect(actuals.compute).toHaveBeenCalledWith(
        TENANT,
        monthBounds('2026-11', 'Africa/Cairo'),
      );
      expect(grid.workspace?.targets.DEALS).toBe(30);
      expect(grid.workspace?.actuals.DEALS).toBe(5);
      const agent = grid.users.find((row) => row.user.id === 'agent-1')!;
      expect(agent.targets).toMatchObject({ REVENUE: 5_000_000, DEALS: null });
      expect(agent.actuals).toMatchObject({ DEALS: 2, REVENUE: 1_000_000 });
      expect(agent.user).toEqual({
        id: 'agent-1',
        name: 'agent-1',
        email: 'agent-1@x.com',
        roleName: 'Agent',
        team: { id: 'team-1', name: 'Sales A' },
      });
    });

    it('lists only active lead holders, and only the team for team managers', async () => {
      const grid = await service.getGrid(owner, TEAM, '2026-10', NOW);

      expect(grid.workspace).toBeNull();
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT,
            isActive: true,
            deletedAt: null,
            id: { in: ['manager-1', 'agent-1'] },
            role: {
              permissions: {
                some: { permission: { key: PERMISSIONS.LEAD_READ } },
              },
            },
          },
        }),
      );
    });
  });

  describe('save', () => {
    it('updates the workspace row found by its null user, creates new rows and clears others', async () => {
      tx.target.findMany.mockResolvedValue([
        {
          id: 'ws-deals',
          userId: null,
          metric: TargetMetric.DEALS,
          value: decimal(20),
        },
        {
          id: 'a1-visits',
          userId: 'agent-1',
          metric: TargetMetric.VISITS,
          value: decimal(12),
        },
        {
          id: 'a1-deals',
          userId: 'agent-1',
          metric: TargetMetric.DEALS,
          value: decimal(3),
        },
      ]);

      await service.save(
        owner,
        ALL,
        {
          period: '2026-11',
          entries: [
            { userId: null, metric: TargetMetric.DEALS, value: 25 },
            {
              userId: 'agent-1',
              metric: TargetMetric.REVENUE,
              value: 4_000_000,
            },
            { userId: 'agent-1', metric: TargetMetric.VISITS, value: null },
            { userId: 'agent-1', metric: TargetMetric.DEALS, value: 3 },
          ],
        },
        NOW,
      );

      expect(tx.target.update).toHaveBeenCalledTimes(1);
      expect(tx.target.update).toHaveBeenCalledWith({
        where: { id: 'ws-deals' },
        data: { value: 25, updatedByUserId: owner.id },
      });
      expect(tx.target.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT,
          userId: 'agent-1',
          period: '2026-11',
          metric: TargetMetric.REVENUE,
          value: 4_000_000,
          updatedByUserId: owner.id,
        },
      });
      expect(tx.target.delete).toHaveBeenCalledWith({
        where: { id: 'a1-visits' },
      });
      // The unchanged DEALS target is not rewritten nor audited.
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: TARGET_AUDIT_ACTIONS.UPDATED,
          metadata: {
            period: '2026-11',
            changes: [
              { userId: null, metric: 'DEALS', from: 20, to: 25 },
              {
                userId: 'agent-1',
                metric: 'REVENUE',
                from: null,
                to: 4_000_000,
              },
              { userId: 'agent-1', metric: 'VISITS', from: 12, to: null },
            ],
          },
          tx,
        }),
      );
    });

    it('writes nothing and skips the audit when nothing changed', async () => {
      await service.save(
        owner,
        ALL,
        {
          period: '2026-11',
          entries: [
            { userId: 'agent-1', metric: TargetMetric.DEALS, value: null },
          ],
        },
        NOW,
      );
      expect(tx.target.delete).not.toHaveBeenCalled();
      expect(audit.createAuditLog).not.toHaveBeenCalled();
    });

    it('maps a concurrent insert on the partial unique index to 409', async () => {
      tx.target.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.save(owner, ALL, {
          period: '2026-11',
          entries: [{ userId: null, metric: TargetMetric.DEALS, value: 10 }],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('keeps workspace targets for workspace-wide managers', async () => {
      await expect(
        service.save(owner, TEAM, {
          period: '2026-11',
          entries: [{ userId: null, metric: TargetMetric.DEALS, value: 10 }],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects people outside the caller scope or deactivated', async () => {
      prisma.user.findMany.mockResolvedValue([person('agent-1')]);
      await expect(
        service.save(owner, TEAM, {
          period: '2026-11',
          entries: [
            { userId: 'agent-9', metric: TargetMetric.DEALS, value: 2 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects fractional counts and duplicate entries', async () => {
      await expect(
        service.save(owner, ALL, {
          period: '2026-11',
          entries: [{ userId: null, metric: TargetMetric.VISITS, value: 2.5 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.save(owner, ALL, {
          period: '2026-11',
          entries: [
            { userId: null, metric: TargetMetric.DEALS, value: 2 },
            { userId: null, metric: TargetMetric.DEALS, value: 3 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('suggest', () => {
    it('averages the 3 complete months before the period', async () => {
      const month = (agentDeals: number, revenue: number) => ({
        byUser: new Map([
          [
            'agent-1',
            { ...emptyMetricValues(), DEALS: agentDeals, REVENUE: revenue },
          ],
        ]),
        total: {
          ...emptyMetricValues(),
          DEALS: agentDeals * 2,
          REVENUE: revenue,
        },
      });
      actuals.compute
        .mockResolvedValueOnce(month(2, 3_000_000))
        .mockResolvedValueOnce(month(3, 4_123_000))
        .mockResolvedValueOnce(month(3, 5_000_000));

      const result = await service.suggest(owner, ALL, '2026-11', NOW);

      expect(result.basedOn).toEqual(['2026-08', '2026-09', '2026-10']);
      expect(actuals.compute).toHaveBeenCalledWith(
        TENANT,
        monthBounds('2026-08', 'Africa/Cairo'),
      );
      const agent = result.users.find((row) => row.userId === 'agent-1')!;
      expect(agent.values.DEALS).toBe(3); // 8 / 3 = 2.67
      expect(agent.values.REVENUE).toBe(4_040_000); // 4,041,000 → 10k
      expect(agent.values.VISITS).toBeNull();
      expect(result.workspace?.DEALS).toBe(5); // 16 / 3 = 5.33
    });

    it('never averages the current unfinished month for a future period', async () => {
      const result = await service.suggest(owner, ALL, '2027-01', NOW);
      expect(result.basedOn).toEqual(['2026-08', '2026-09', '2026-10']);
    });

    it('averages a new joiner over the months they were here', async () => {
      prisma.user.findMany.mockResolvedValue([
        person('agent-1', new Date('2026-10-05T08:00:00Z')),
      ]);
      const quiet = { byUser: new Map(), total: emptyMetricValues() };
      actuals.compute
        .mockResolvedValueOnce(quiet)
        .mockResolvedValueOnce(quiet)
        .mockResolvedValueOnce({
          byUser: new Map([
            ['agent-1', { ...emptyMetricValues(), INTERACTIONS: 300 }],
          ]),
          total: emptyMetricValues(),
        });

      const result = await service.suggest(owner, TEAM, '2026-11', NOW);
      expect(result.workspace).toBeNull();
      expect(result.users[0].values.INTERACTIONS).toBe(300);
    });

    it('counts history from before the account existed (imported or seeded work)', async () => {
      prisma.user.findMany.mockResolvedValue([
        person('agent-1', new Date('2026-11-10T08:00:00Z')),
      ]);
      const worked = (interactions: number) => ({
        byUser: new Map([
          ['agent-1', { ...emptyMetricValues(), INTERACTIONS: interactions }],
        ]),
        total: emptyMetricValues(),
      });
      actuals.compute
        .mockResolvedValueOnce({
          byUser: new Map(),
          total: emptyMetricValues(),
        })
        .mockResolvedValueOnce(worked(200))
        .mockResolvedValueOnce(worked(400));

      const result = await service.suggest(owner, TEAM, '2026-11', NOW);
      // From the first active month (September): (200 + 400) / 2.
      expect(result.users[0].values.INTERACTIONS).toBe(300);
    });
  });

  describe('getMine', () => {
    it('reports pace against working days and hides workspace totals from agents', async () => {
      prisma.target.findMany.mockResolvedValue([
        {
          userId: owner.id,
          metric: TargetMetric.INTERACTIONS,
          value: decimal(520),
        },
      ]);
      actuals.compute.mockResolvedValue({
        byUser: new Map([
          [owner.id, { ...emptyMetricValues(), INTERACTIONS: 200 }],
        ]),
        total: emptyMetricValues(),
      });

      const result = await service.getMine(owner, new Set(), undefined, NOW);

      expect(actuals.compute).toHaveBeenCalledWith(
        TENANT,
        monthBounds('2026-11', 'Africa/Cairo'),
        { userId: owner.id },
      );
      expect(result.hasTargets).toBe(true);
      expect(result.workspace).toBeNull();
      const interactions = result.metrics.find(
        (metric) => metric.metric === TargetMetric.INTERACTIONS,
      )!;
      // 520 × (14 + 2/9) / 26 ≈ 284.4 expected by now → behind by 84.
      expect(interactions.status).toBe('BEHIND');
      expect(interactions.behindBy).toBe(84);
      expect(
        result.metrics.find((metric) => metric.metric === TargetMetric.DEALS)
          ?.status,
      ).toBeNull();
    });

    it('adds workspace totals for analytics readers who see every lead', async () => {
      prisma.target.findMany.mockResolvedValue([
        { userId: null, metric: TargetMetric.DEALS, value: decimal(10) },
      ]);
      actuals.compute.mockResolvedValue({
        byUser: new Map(),
        total: { ...emptyMetricValues(), DEALS: 9 },
      });

      const result = await service.getMine(
        owner,
        new Set([PERMISSIONS.ANALYTICS_READ, PERMISSIONS.LEAD_READ_ALL]),
        undefined,
        NOW,
      );

      expect(actuals.compute).toHaveBeenCalledWith(
        TENANT,
        expect.anything(),
        {},
      );
      expect(result.hasTargets).toBe(false);
      expect(result.workspace?.hasTargets).toBe(true);
      expect(
        result.workspace?.metrics.find((m) => m.metric === TargetMetric.DEALS),
      ).toMatchObject({ target: 10, actual: 9, status: 'ON_TRACK' });
    });
  });
});
