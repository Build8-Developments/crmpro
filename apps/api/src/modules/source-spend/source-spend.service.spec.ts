import { BadRequestException } from '@nestjs/common';
import { DealStatus, Prisma } from '@crmpro/database';
import { monthBounds } from '../../common/utils/month-period.util';
import { SPEND_AUDIT_ACTIONS } from './source-spend.constants';
import {
  costPer,
  resolveRange,
  SourceSpendService,
} from './source-spend.service';

const TENANT = 'tenant-1';
const owner = { id: 'owner-1', tenantId: TENANT, roleId: 'r', sessionId: 's' };
const FACEBOOK = '11111111-1111-4111-8111-111111111111';
const WEBSITE = '22222222-2222-4222-8222-222222222222';

describe('resolveRange', () => {
  it('defaults to the current month and the 5 before', () => {
    expect(resolveRange({}, '2026-11')).toEqual({
      from: '2026-06',
      to: '2026-11',
    });
  });

  it('opens a 6-month window from either end', () => {
    expect(resolveRange({ from: '2026-01' }, '2026-11')).toEqual({
      from: '2026-01',
      to: '2026-06',
    });
    expect(resolveRange({ to: '2026-03' }, '2026-11')).toEqual({
      from: '2025-10',
      to: '2026-03',
    });
  });

  it('allows 12 months at most, in order', () => {
    expect(
      resolveRange({ from: '2025-12', to: '2026-11' }, '2026-11').from,
    ).toBe('2025-12');
    expect(() =>
      resolveRange({ from: '2025-11', to: '2026-11' }, '2026-11'),
    ).toThrow(BadRequestException);
    expect(() =>
      resolveRange({ from: '2026-05', to: '2026-04' }, '2026-11'),
    ).toThrow(BadRequestException);
  });
});

describe('costPer', () => {
  it('divides spend by results, null when either is missing', () => {
    expect(costPer(100_000, 40)).toBe(2500);
    expect(costPer(100_000, 3)).toBe(33333.33);
    expect(costPer(100_000, 0)).toBeNull();
    expect(costPer(null, 10)).toBeNull();
  });
});

describe('SourceSpendService', () => {
  let tx: {
    sourceSpend: { findMany: jest.Mock; upsert: jest.Mock; delete: jest.Mock };
  };
  let prisma: {
    tenantSettings: { findUnique: jest.Mock };
    leadSource: { findMany: jest.Mock; count: jest.Mock };
    sourceSpend: { findMany: jest.Mock };
    lead: { groupBy: jest.Mock };
    deal: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { createAuditLog: jest.Mock };
  let service: SourceSpendService;

  beforeEach(() => {
    tx = {
      sourceSpend: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };
    prisma = {
      tenantSettings: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ timezone: 'Africa/Cairo', currency: 'EGP' }),
      },
      leadSource: {
        findMany: jest.fn().mockResolvedValue([
          { id: FACEBOOK, name: 'Facebook' },
          { id: WEBSITE, name: 'Website' },
        ]),
        count: jest.fn().mockResolvedValue(2),
      },
      sourceSpend: { findMany: jest.fn().mockResolvedValue([]) },
      lead: { groupBy: jest.fn().mockResolvedValue([]) },
      deal: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    audit = { createAuditLog: jest.fn() };
    service = new SourceSpendService(prisma as never, audit as never);
  });

  describe('getGrid', () => {
    it('puts spend next to leads, visits and deals with cost per result', async () => {
      prisma.sourceSpend.findMany.mockResolvedValue([
        {
          sourceId: FACEBOOK,
          period: '2026-11',
          amount: new Prisma.Decimal(200_000),
          note: 'Two campaigns',
        },
      ]);
      // Months 2026-10 and 2026-11: leads (Oct, Nov), then visits (Oct, Nov).
      prisma.lead.groupBy
        .mockResolvedValueOnce([{ sourceId: FACEBOOK, _count: { _all: 30 } }])
        .mockResolvedValueOnce([
          { sourceId: FACEBOOK, _count: { _all: 80 } },
          { sourceId: WEBSITE, _count: { _all: 20 } },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ sourceId: FACEBOOK, _count: { _all: 8 } }]);
      prisma.deal.findMany.mockResolvedValue([
        // 00:30 on 1 Nov in Cairo → November.
        {
          reservedAt: new Date('2026-10-31T22:30:00Z'),
          lead: { sourceId: FACEBOOK },
        },
        {
          reservedAt: new Date('2026-10-20T10:00:00Z'),
          lead: { sourceId: FACEBOOK },
        },
      ]);

      const grid = await service.getGrid(
        TENANT,
        { from: '2026-10', to: '2026-11' },
        new Date('2026-11-17T10:00:00Z'),
      );

      expect(grid.periods).toEqual(['2026-10', '2026-11']);
      expect(grid.currency).toBe('EGP');
      const facebook = grid.sources.find((row) => row.source.id === FACEBOOK)!;
      expect(facebook.months[1]).toEqual({
        period: '2026-11',
        amount: 200_000,
        note: 'Two campaigns',
        leads: 80,
        visits: 8,
        deals: 1,
        costPerLead: 2500,
        costPerVisit: 25_000,
        costPerDeal: 200_000,
      });
      expect(facebook.months[0]).toMatchObject({
        amount: null,
        leads: 30,
        deals: 1,
        costPerLead: null,
      });
      expect(grid.totals[1]).toMatchObject({
        amount: 200_000,
        leads: 100,
        costPerLead: 2000,
      });
      expect(grid.totals[0].amount).toBeNull();
    });

    it('counts leads and visits between Cairo midnights and skips cancelled deals', async () => {
      await service.getGrid(
        TENANT,
        { from: '2026-11', to: '2026-11' },
        new Date('2026-11-17T10:00:00Z'),
      );
      const { start, end } = monthBounds('2026-11', 'Africa/Cairo');

      expect(prisma.lead.groupBy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            tenantId: TENANT,
            deletedAt: null,
            sourceId: { not: null },
            createdAt: { gte: start, lt: end },
          },
        }),
      );
      expect(prisma.lead.groupBy.mock.calls[1][0].where.interactions).toEqual({
        some: {
          occurredAt: { gte: start, lt: end },
          OR: [{ channel: 'SITE_VISIT' }, { outcome: 'VISIT_DONE' }],
        },
      });
      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT,
            status: { not: DealStatus.CANCELLED },
            reservedAt: { gte: start, lt: end },
          }),
        }),
      );
    });
  });

  describe('save', () => {
    it('upserts amounts, clears nulls and audits the changes', async () => {
      tx.sourceSpend.findMany.mockResolvedValue([
        {
          id: 'spend-1',
          sourceId: FACEBOOK,
          period: '2026-10',
          amount: new Prisma.Decimal(150_000),
          note: 'Old',
        },
        {
          id: 'spend-2',
          sourceId: WEBSITE,
          period: '2026-10',
          amount: new Prisma.Decimal(5_000),
          note: null,
        },
      ]);

      const result = await service.save(owner, {
        entries: [
          { sourceId: FACEBOOK, period: '2026-11', amount: 200_000 },
          { sourceId: FACEBOOK, period: '2026-10', amount: 150_000 },
          { sourceId: WEBSITE, period: '2026-10', amount: null },
        ],
      });

      expect(result).toEqual({ changed: 2 });
      expect(tx.sourceSpend.upsert).toHaveBeenCalledTimes(1);
      expect(tx.sourceSpend.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_sourceId_period: {
              tenantId: TENANT,
              sourceId: FACEBOOK,
              period: '2026-11',
            },
          },
        }),
      );
      expect(tx.sourceSpend.delete).toHaveBeenCalledWith({
        where: { id: 'spend-2' },
      });
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT,
          action: SPEND_AUDIT_ACTIONS.UPDATED,
          tx,
        }),
      );
    });

    it('rejects sources from another workspace', async () => {
      prisma.leadSource.count.mockResolvedValue(1);
      await expect(
        service.save(owner, {
          entries: [
            { sourceId: FACEBOOK, period: '2026-11', amount: 1 },
            { sourceId: WEBSITE, period: '2026-11', amount: 1 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.leadSource.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT, id: { in: [FACEBOOK, WEBSITE] } },
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects the same source and month twice', async () => {
      await expect(
        service.save(owner, {
          entries: [
            { sourceId: FACEBOOK, period: '2026-11', amount: 1 },
            { sourceId: FACEBOOK, period: '2026-11', amount: 2 },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
