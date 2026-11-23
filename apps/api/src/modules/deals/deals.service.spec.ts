import { Test } from '@nestjs/testing';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { Prisma } from '@crmpro/database';
import { PermissionsService, type LeadScope } from '../../common/auth';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { LeadStageService } from '../leads/services/lead-stage.service';
import { DealsService } from './deals.service';
import { DailyStatsService } from '../stats/daily-stats.service';
import { DealRecorderService } from './services/deal-recorder.service';
import { DealRulesService } from '../workflow/rules/deal-rules.service';

const own: LeadScope = { kind: 'own', actorUserId: 'agent-1' };

function dealRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deal-1',
    leadId: 'lead-1',
    unitType: 'Apartment',
    unitCode: null,
    price: new Prisma.Decimal(4_000_000),
    currency: 'EGP',
    downPaymentPct: null,
    paymentPlan: null,
    commissionPct: new Prisma.Decimal(2),
    commissionAmount: new Prisma.Decimal(80_000),
    status: 'RESERVED',
    reservedAt: new Date('2026-11-01T10:00:00Z'),
    contractedAt: null,
    expectedContractAt: null,
    cancelledAt: null,
    cancelReason: null,
    notes: null,
    createdAt: new Date('2026-11-01T10:00:00Z'),
    updatedAt: new Date('2026-11-01T10:00:00Z'),
    lead: {
      id: 'lead-1',
      fullName: 'Mona Adel',
      assignedUserId: 'agent-1',
      pipelineStage: {
        id: 'stage-won',
        name: 'Won',
        color: null,
        icon: null,
        isClosed: true,
        closeType: 'WON',
      },
    },
    project: { id: 'project-1', name: 'Palm Hills' },
    agent: { id: 'agent-1', name: 'Agent' },
    createdBy: { id: 'agent-1', name: 'Agent' },
    ...overrides,
  };
}

describe('DealsService', () => {
  let service: DealsService;
  let tx: {
    deal: {
      update: jest.Mock;
      updateMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };
  let prisma: {
    deal: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    lead: { findFirst: jest.Mock };
    project: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let permissions: { getPermissionKeysForUser: jest.Mock };
  let leadStage: { reopenWonLeadInTx: jest.Mock; afterStageMove: jest.Mock };
  let activity: { createActivity: jest.Mock };
  let audit: { createAuditLog: jest.Mock };
  let events: { publish: jest.Mock };
  let dailyStats: { recomputeForDeal: jest.Mock };
  let dealRules: {
    onDealReserved: jest.Mock;
    onDealContracted: jest.Mock;
    onDealCancelled: jest.Mock;
    onDealEdited: jest.Mock;
  };

  beforeEach(async () => {
    tx = {
      deal: {
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn(),
      },
    };
    prisma = {
      deal: {
        findFirst: jest.fn().mockResolvedValue(dealRecord()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      lead: { findFirst: jest.fn() },
      project: { findFirst: jest.fn() },
      user: {
        findFirst: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve({ id: where.id, name: 'Someone' }),
          ),
      },
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (client: typeof tx) => unknown)(tx)
          : Promise.all(arg as Promise<unknown>[]),
      ),
    };
    permissions = {
      getPermissionKeysForUser: jest
        .fn()
        .mockResolvedValue(new Set([PERMISSIONS.DEAL_WRITE])),
    };
    leadStage = {
      reopenWonLeadInTx: jest.fn().mockResolvedValue({
        activity: { id: 'a' },
        cancelledTaskCount: 0,
        fromStage: { id: 'stage-won', name: 'Won' },
        targetStage: {
          id: 'stage-negotiation',
          name: 'Negotiation',
          isClosed: false,
          closeType: null,
        },
      }),
      afterStageMove: jest.fn().mockResolvedValue({}),
    };
    activity = { createActivity: jest.fn() };
    audit = { createAuditLog: jest.fn() };
    events = { publish: jest.fn() };
    dailyStats = { recomputeForDeal: jest.fn().mockResolvedValue(undefined) };
    dealRules = {
      onDealReserved: jest.fn(),
      onDealContracted: jest.fn(),
      onDealCancelled: jest.fn(),
      onDealEdited: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        DealsService,
        DealRecorderService,
        { provide: PrismaService, useValue: prisma },
        { provide: PermissionsService, useValue: permissions },
        { provide: LeadStageService, useValue: leadStage },
        { provide: LeadActivityService, useValue: activity },
        { provide: AuditWriterService, useValue: audit },
        { provide: DomainEventBus, useValue: events },
        { provide: DailyStatsService, useValue: dailyStats },
        { provide: DealRulesService, useValue: dealRules },
      ],
    }).compile();
    service = module.get(DealsService);
  });

  describe('list', () => {
    it('scopes deals through their lead and filters the period', async () => {
      await service.list(
        't',
        {
          status: 'CONTRACTED',
          search: 'mona',
          from: new Date('2026-11-01'),
          to: new Date('2026-12-01'),
        },
        own,
      );

      const where = prisma.deal.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({
        tenantId: 't',
        status: 'CONTRACTED',
        lead: {
          tenantId: 't',
          deletedAt: null,
          OR: [
            { assignedUserId: { in: ['agent-1'] } },
            { assignedUserId: null },
          ],
          fullName: { contains: 'mona', mode: 'insensitive' },
        },
        AND: [
          {
            OR: [
              {
                reservedAt: {
                  gte: new Date('2026-11-01'),
                  lt: new Date('2026-12-01'),
                },
              },
              {
                contractedAt: {
                  gte: new Date('2026-11-01'),
                  lt: new Date('2026-12-01'),
                },
              },
            ],
          },
        ],
      });
      // Totals use the same filter.
      expect(prisma.deal.groupBy.mock.calls[0][0].where).toBe(where);
    });

    it('filters the period on the cancellation date', async () => {
      await service.list(
        't',
        {
          status: 'CANCELLED',
          from: new Date('2026-11-01'),
          to: new Date('2026-12-01'),
          periodField: 'cancelledAt',
        },
        own,
      );

      expect(prisma.deal.findMany.mock.calls[0][0].where).toMatchObject({
        status: 'CANCELLED',
        AND: [
          {
            cancelledAt: {
              gte: new Date('2026-11-01'),
              lt: new Date('2026-12-01'),
            },
          },
        ],
      });
    });

    it('sums count, price and commission by status', async () => {
      prisma.deal.groupBy.mockResolvedValue([
        {
          status: 'RESERVED',
          _count: { _all: 2 },
          _sum: {
            price: new Prisma.Decimal(5_000_000),
            commissionAmount: new Prisma.Decimal(100_000),
          },
        },
        {
          status: 'CONTRACTED',
          _count: { _all: 1 },
          _sum: {
            price: new Prisma.Decimal(3_000_000),
            commissionAmount: null,
          },
        },
      ]);

      const result = await service.list('t', {}, own);

      expect(result.totals).toEqual({
        count: 3,
        price: 8_000_000,
        commission: 100_000,
        byStatus: {
          RESERVED: { count: 2, price: 5_000_000, commission: 100_000 },
          CONTRACTED: { count: 1, price: 3_000_000, commission: 0 },
          CANCELLED: { count: 0, price: 0, commission: 0 },
        },
      });
      // Newest reservation first by default.
      expect(prisma.deal.findMany.mock.calls[0][0].orderBy[0]).toEqual({
        reservedAt: 'desc',
      });
    });

    it('rejects unknown sort fields', async () => {
      await expect(
        service.list('t', { sortBy: 'unitCode' }, own),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  it('404s on a deal outside the lead scope', async () => {
    prisma.deal.findFirst.mockResolvedValue(null);
    await expect(service.get('t', 'deal-x', own)).rejects.toMatchObject({
      status: 404,
    });
    expect(prisma.deal.findFirst.mock.calls[0][0].where.lead).toMatchObject({
      OR: [{ assignedUserId: { in: ['agent-1'] } }, { assignedUserId: null }],
    });
  });

  it('lists a lead history only when the lead is in scope', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);
    await expect(service.listForLead('t', 'lead-x', own)).rejects.toMatchObject(
      { status: 404 },
    );
    expect(prisma.deal.findMany).not.toHaveBeenCalled();
  });

  describe('update', () => {
    it('recomputes the commission and lists the changed fields', async () => {
      tx.deal.update.mockResolvedValue(
        dealRecord({ price: new Prisma.Decimal(5_000_000) }),
      );

      await service.update(
        't',
        'agent-1',
        'deal-1',
        { price: 5_000_000, unitType: 'Apartment' },
        own,
      );

      expect(tx.deal.update.mock.calls[0][0].data).toMatchObject({
        price: 5_000_000,
        commissionAmount: 100_000,
      });
      expect(activity.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DEAL_UPDATED',
          metadata: expect.objectContaining({
            changedFields: ['price', 'commissionAmount'],
          }),
        }),
        tx,
      );
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEAL_UPDATED', tx }),
      );
      expect(events.publish).toHaveBeenCalled();
    });

    it('needs lead.assign to change the agent', async () => {
      await expect(
        service.update('t', 'agent-1', 'deal-1', { agentId: 'agent-2' }, own),
      ).rejects.toMatchObject({ status: 403 });
      expect(tx.deal.update).not.toHaveBeenCalled();
    });

    it('writes nothing when nothing changed', async () => {
      await service.update(
        't',
        'agent-1',
        'deal-1',
        { unitType: 'Apartment' },
        own,
      );
      expect(tx.deal.update).not.toHaveBeenCalled();
      expect(activity.createActivity).not.toHaveBeenCalled();
    });

    it('sets the expected contract date and moves the R10 escalation', async () => {
      const expectedContractAt = new Date('2026-12-01T10:00:00Z');
      tx.deal.update.mockResolvedValue(dealRecord({ expectedContractAt }));

      await service.update(
        't',
        'agent-1',
        'deal-1',
        { expectedContractAt },
        own,
      );

      expect(tx.deal.update.mock.calls[0][0].data).toEqual({
        expectedContractAt,
      });
      expect(dealRules.onDealEdited).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ leadId: 'lead-1', expectedContractAt }),
        { deadlineChanged: true, newAgentId: undefined },
      );
    });

    it('rejects an expected contract date before the reservation', async () => {
      await expect(
        service.update(
          't',
          'agent-1',
          'deal-1',
          { expectedContractAt: new Date('2026-10-01T10:00:00Z') },
          own,
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('only a reserved deal takes an expected contract date', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        dealRecord({ status: 'CONTRACTED', contractedAt: new Date() }),
      );
      await expect(
        service.update(
          't',
          'agent-1',
          'deal-1',
          { expectedContractAt: new Date('2026-12-01T10:00:00Z') },
          own,
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('does not touch the rule tasks for other edits', async () => {
      tx.deal.update.mockResolvedValue(
        dealRecord({ price: new Prisma.Decimal(5_000_000) }),
      );
      await service.update('t', 'agent-1', 'deal-1', { price: 5_000_000 }, own);
      expect(dealRules.onDealEdited).not.toHaveBeenCalled();
    });

    it('refuses to edit a cancelled deal', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        dealRecord({ status: 'CANCELLED' }),
      );
      await expect(
        service.update('t', 'agent-1', 'deal-1', { price: 1 }, own),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('contract', () => {
    it('moves a reserved deal to contracted', async () => {
      tx.deal.findUniqueOrThrow.mockResolvedValue(
        dealRecord({ status: 'CONTRACTED', contractedAt: new Date() }),
      );
      const contractedAt = new Date('2026-11-10T10:00:00Z');

      const result = await service.contract(
        't',
        'agent-1',
        'deal-1',
        { contractedAt },
        own,
      );

      expect(tx.deal.updateMany).toHaveBeenCalledWith({
        where: { id: 'deal-1', status: 'RESERVED' },
        data: { status: 'CONTRACTED', contractedAt },
      });
      expect(activity.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'DEAL_CONTRACTED' }),
        tx,
      );
      expect(result.status).toBe('CONTRACTED');
      // R10: the paperwork task is done.
      expect(dealRules.onDealContracted).toHaveBeenCalledWith(
        tx,
        'lead-1',
        expect.any(Date),
      );
    });

    it('rejects a contract date before the reservation', async () => {
      await expect(
        service.contract(
          't',
          'agent-1',
          'deal-1',
          { contractedAt: new Date('2026-10-01T10:00:00Z') },
          own,
        ),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('only contracts reserved deals', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        dealRecord({ status: 'CONTRACTED' }),
      );
      await expect(
        service.contract('t', 'agent-1', 'deal-1', {}, own),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('cancel', () => {
    it('cancels the deal and re-opens the lead in the same transaction', async () => {
      tx.deal.findUniqueOrThrow.mockResolvedValue(
        dealRecord({ status: 'CANCELLED', cancelReason: 'Client withdrew' }),
      );

      const result = await service.cancel(
        't',
        'manager-1',
        'deal-1',
        { reason: 'Client withdrew' },
        own,
      );

      expect(tx.deal.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED',
            cancelReason: 'Client withdrew',
          }),
        }),
      );
      expect(activity.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'DEAL_CANCELLED' }),
        tx,
      );
      expect(leadStage.reopenWonLeadInTx).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ leadId: 'lead-1', dealId: 'deal-1' }),
      );
      // R10/R11 tasks of the deal are cancelled in the same transaction.
      expect(dealRules.onDealCancelled).toHaveBeenCalledWith(
        tx,
        'lead-1',
        expect.any(Date),
      );
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DEAL_CANCELLED',
          metadata: expect.objectContaining({
            reopenedToStageId: 'stage-negotiation',
          }),
        }),
      );
      // Post-commit events/notification come from the stage-move internals.
      expect(leadStage.afterStageMove).toHaveBeenCalledWith(
        't',
        'lead-1',
        'manager-1',
        expect.objectContaining({
          targetStage: expect.objectContaining({ id: 'stage-negotiation' }),
        }),
      );
      expect(result.status).toBe('CANCELLED'); // The days the deal was counted on are recomputed for its agent.
      expect(dailyStats.recomputeForDeal).toHaveBeenCalledWith(
        't',
        expect.arrayContaining([
          expect.objectContaining({ reservedAt: expect.any(Date) as unknown }),
        ]),
      );
    });

    it('refuses to cancel twice', async () => {
      prisma.deal.findFirst.mockResolvedValue(
        dealRecord({ status: 'CANCELLED' }),
      );
      await expect(
        service.cancel('t', 'manager-1', 'deal-1', { reason: 'x' }, own),
      ).rejects.toMatchObject({ status: 400 });
      expect(tx.deal.updateMany).not.toHaveBeenCalled();
    });
  });
});
