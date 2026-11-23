import {
  DealStatus,
  InteractionChannel,
  InteractionOutcome,
  Prisma,
} from '@crmpro/database';
import { monthBounds } from '../../common/utils/month-period.util';
import { TargetActualsService } from './target-actuals.service';

describe('TargetActualsService', () => {
  const bounds = monthBounds('2026-11', 'Africa/Cairo');
  let prisma: {
    deal: { groupBy: jest.Mock };
    interaction: { groupBy: jest.Mock };
  };
  let service: TargetActualsService;

  beforeEach(() => {
    prisma = {
      deal: { groupBy: jest.fn() },
      interaction: { groupBy: jest.fn() },
    };
    // Order of calls: reserved deals, contracted deals.
    prisma.deal.groupBy
      .mockResolvedValueOnce([
        { agentId: 'agent-1', _count: { _all: 2 } },
        { agentId: 'agent-2', _count: { _all: 1 } },
        { agentId: null, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        {
          agentId: 'agent-1',
          _sum: {
            price: new Prisma.Decimal('3500000.50'),
            commissionAmount: new Prisma.Decimal('87500'),
          },
        },
        {
          agentId: 'agent-2',
          _sum: {
            price: new Prisma.Decimal('2000000'),
            commissionAmount: null,
          },
        },
      ]);
    // Order of calls: all interactions, visits.
    prisma.interaction.groupBy
      .mockResolvedValueOnce([
        { userId: 'agent-1', _count: { _all: 120 } },
        { userId: 'agent-3', _count: { _all: 40 } },
      ])
      .mockResolvedValueOnce([{ userId: 'agent-1', _count: { _all: 6 } }]);
    service = new TargetActualsService(prisma as never);
  });

  it('adds up deals, money, touches and visits per person and in total', async () => {
    const result = await service.compute('tenant-1', bounds);

    expect(result.byUser.get('agent-1')).toEqual({
      DEALS: 2,
      REVENUE: 3_500_000.5,
      COMMISSION: 87_500,
      INTERACTIONS: 120,
      VISITS: 6,
    });
    expect(result.byUser.get('agent-2')).toMatchObject({
      DEALS: 1,
      REVENUE: 2_000_000,
      COMMISSION: 0,
    });
    expect(result.byUser.get('agent-3')).toMatchObject({ INTERACTIONS: 40 });
    // The workspace includes the deal nobody is credited for.
    expect(result.total).toEqual({
      DEALS: 4,
      REVENUE: 5_500_000.5,
      COMMISSION: 87_500,
      INTERACTIONS: 160,
      VISITS: 6,
    });
  });

  it('counts reserved and contracted deals in the month, never cancelled ones', async () => {
    await service.compute('tenant-1', bounds);
    const range = { gte: bounds.start, lt: bounds.end };

    expect(prisma.deal.groupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          lead: { deletedAt: null },
          status: { not: DealStatus.CANCELLED },
          reservedAt: range,
        },
      }),
    );
    expect(prisma.deal.groupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          lead: { deletedAt: null },
          status: { not: DealStatus.CANCELLED },
          contractedAt: range,
        },
      }),
    );
  });

  it('counts a visit once whether it was a site visit, a "visit done", or both', async () => {
    await service.compute('tenant-1', bounds);

    expect(prisma.interaction.groupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          lead: { deletedAt: null },
          occurredAt: { gte: bounds.start, lt: bounds.end },
          OR: [
            { channel: InteractionChannel.SITE_VISIT },
            { outcome: InteractionOutcome.VISIT_DONE },
          ],
        },
        _count: { _all: true },
      }),
    );
  });

  it('narrows every query to one person when asked', async () => {
    await service.compute('tenant-1', bounds, { userId: 'agent-1' });

    for (const call of prisma.deal.groupBy.mock.calls) {
      expect(call[0].where.agentId).toBe('agent-1');
    }
    for (const call of prisma.interaction.groupBy.mock.calls) {
      expect(call[0].where.userId).toBe('agent-1');
    }
  });
});
