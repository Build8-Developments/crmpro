import { SYSTEM_LEAD_SCOPE, PermissionsService } from '../../../common/auth';
import { Test } from '@nestjs/testing';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { DealRecorderService } from '../../deals/services/deal-recorder.service';
import { DealRulesService } from '../../workflow/rules/deal-rules.service';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { TaskLifecycleService } from '../../workflow/common/task-lifecycle.service';
import { LostReasonsService } from '../../workflow/lost-reasons/lost-reasons.service';
import * as leadMapper from '../lead.mapper';
import { LeadActivityService } from './lead-activity.service';
import { LeadStageService } from './lead-stage.service';

const WON_STAGE = {
  id: 'stage-won',
  name: 'Won',
  isClosed: true,
  closeType: 'WON',
};
const OPEN_STAGE = {
  id: 'stage-next',
  name: 'Proposal',
  isClosed: false,
  closeType: null,
};

describe('LeadStageService', () => {
  let service: LeadStageService;
  let tx: {
    lead: { update: jest.Mock; findFirst: jest.Mock };
    deal: { create: jest.Mock };
    leadActivity: { findFirst: jest.Mock };
    pipelineStage: { findFirst: jest.Mock };
  };
  let prisma: {
    lead: { findFirst: jest.Mock };
    pipelineStage: { findFirst: jest.Mock };
    deal: { findFirst: jest.Mock };
    project: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    tenantSettings: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let lifecycle: { cancelOpenTasks: jest.Mock };
  let lostReasons: { assertUsable: jest.Mock };
  let activity: { createActivity: jest.Mock };
  let audit: { createAuditLog: jest.Mock };
  let permissions: { getPermissionKeysForUser: jest.Mock };
  let events: { publish: jest.Mock };

  const workflowLead = {
    id: 'lead-1',
    tenantId: 't',
    status: 'OPEN',
    pipelineId: 'p',
    pipelineStageId: 'stage-open',
    assignedUserId: 'agent-1',
    pipelineStage: { id: 'stage-open', name: 'Qualified', closeType: null },
  };

  const keys = (...extra: string[]) =>
    new Set([PERMISSIONS.LEAD_UPDATE, PERMISSIONS.DEAL_WRITE, ...extra]);

  beforeEach(async () => {
    tx = {
      lead: { update: jest.fn(), findFirst: jest.fn() },
      deal: { create: jest.fn().mockResolvedValue({ id: 'deal-1' }) },
      leadActivity: { findFirst: jest.fn() },
      pipelineStage: { findFirst: jest.fn() },
    };
    prisma = {
      lead: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(workflowLead)
          .mockResolvedValue({
            ...workflowLead,
            fullName: 'Lead',
            assignedUser: null,
          }),
      },
      pipelineStage: { findFirst: jest.fn() },
      deal: { findFirst: jest.fn().mockResolvedValue(null) },
      project: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'project-1', name: 'Palm Hills' }),
      },
      user: {
        findFirst: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve({ id: where.id, name: `Name of ${where.id}` }),
          ),
      },
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({ currency: 'EGP' }),
      },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    lifecycle = { cancelOpenTasks: jest.fn().mockResolvedValue(2) };
    lostReasons = {
      assertUsable: jest
        .fn()
        .mockResolvedValue({ id: 'reason-1', name: 'Budget too low' }),
    };
    activity = { createActivity: jest.fn().mockResolvedValue({ id: 'a' }) };
    audit = { createAuditLog: jest.fn() };
    permissions = {
      getPermissionKeysForUser: jest.fn().mockResolvedValue(keys()),
    };
    events = { publish: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        LeadStageService,
        DealRecorderService,
        { provide: PrismaService, useValue: prisma },
        { provide: LeadActivityService, useValue: activity },
        { provide: DomainEventBus, useValue: events },
        {
          provide: NotificationTriggerService,
          useValue: { notifyLeadStageChanged: jest.fn() },
        },
        { provide: TaskLifecycleService, useValue: lifecycle },
        { provide: LostReasonsService, useValue: lostReasons },
        { provide: PermissionsService, useValue: permissions },
        { provide: AuditWriterService, useValue: audit },
        {
          provide: DealRulesService,
          useValue: { onDealReserved: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(LeadStageService);
    jest
      .spyOn(leadMapper, 'toLeadResponse')
      .mockReturnValue({} as ReturnType<typeof leadMapper.toLeadResponse>);
  });

  describe('moveStage — Lost', () => {
    it('requires a lost reason for a LOST stage', async () => {
      prisma.pipelineStage.findFirst.mockResolvedValue({
        id: 'stage-lost',
        name: 'Lost',
        isClosed: true,
        closeType: 'LOST',
      });

      await expect(
        service.moveStage(
          'lead-1',
          't',
          'u',
          { pipelineStageId: 'stage-lost' },
          SYSTEM_LEAD_SCOPE,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'LOST_REASON_REQUIRED' }),
      });
      expect(tx.lead.update).not.toHaveBeenCalled();
    });

    it('stores the reason, stamps closedAt and cancels open tasks', async () => {
      prisma.pipelineStage.findFirst.mockResolvedValue({
        id: 'stage-lost',
        name: 'Lost',
        isClosed: true,
        closeType: 'LOST',
      });

      await service.moveStage(
        'lead-1',
        't',
        'u',
        {
          pipelineStageId: 'stage-lost',
          lostReasonId: 'reason-1',
          lostNote: 'Went with a resale unit',
        },
        SYSTEM_LEAD_SCOPE,
      );

      const data = tx.lead.update.mock.calls[0][0].data;
      expect(data.lostReasonId).toBe('reason-1');
      expect(data.lostNote).toBe('Went with a resale unit');
      expect(data.closedAt).toBeInstanceOf(Date);
      expect(data.stageEnteredAt).toBeInstanceOf(Date);
      expect(lifecycle.cancelOpenTasks).toHaveBeenCalledWith('lead-1', tx);
      expect(tx.deal.create).not.toHaveBeenCalled();
      // Cancelled tasks refresh Today.
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'tasks.changed' }),
      );
    });

    it('clears close data when moving to an open stage', async () => {
      prisma.pipelineStage.findFirst.mockResolvedValue(OPEN_STAGE);

      await service.moveStage(
        'lead-1',
        't',
        'u',
        { pipelineStageId: 'stage-next' },
        SYSTEM_LEAD_SCOPE,
      );

      const data = tx.lead.update.mock.calls[0][0].data;
      expect(data.closedAt).toBeNull();
      expect(data.lostReasonId).toBeNull();
      expect(lifecycle.cancelOpenTasks).not.toHaveBeenCalled();
    });
  });

  describe('moveStage — Won', () => {
    beforeEach(() => {
      prisma.pipelineStage.findFirst.mockResolvedValue(WON_STAGE);
    });

    it('requires the deal details', async () => {
      await expect(
        service.moveStage(
          'lead-1',
          't',
          'u',
          { pipelineStageId: 'stage-won' },
          SYSTEM_LEAD_SCOPE,
        ),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'DEAL_REQUIRED' }),
      });
      expect(tx.lead.update).not.toHaveBeenCalled();
      expect(tx.deal.create).not.toHaveBeenCalled();
    });

    it('creates the deal in the same transaction, credited to the owner', async () => {
      await service.moveStage(
        'lead-1',
        't',
        'u',
        {
          pipelineStageId: 'stage-won',
          deal: {
            projectId: 'project-1',
            unitType: 'Apartment',
            price: 5_000_000,
            commissionPct: 2.5,
          },
        },
        SYSTEM_LEAD_SCOPE,
      );

      expect(tx.lead.update).toHaveBeenCalled();
      expect(tx.deal.create).toHaveBeenCalledTimes(1);
      const data = tx.deal.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        tenantId: 't',
        leadId: 'lead-1',
        projectId: 'project-1',
        agentId: 'agent-1',
        createdByUserId: 'u',
        unitType: 'Apartment',
        price: 5_000_000,
        currency: 'EGP',
        commissionPct: 2.5,
        commissionAmount: 125_000,
        status: 'RESERVED',
      });
      expect(activity.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'DEAL_RESERVED' }),
        tx,
      );
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          tx,
          action: 'DEAL_RESERVED',
          entityId: 'deal-1',
        }),
      );
    });

    it('needs lead.assign to credit someone other than the owner', async () => {
      await expect(
        service.moveStage(
          'lead-1',
          't',
          'u',
          {
            pipelineStageId: 'stage-won',
            deal: { unitType: 'Villa', price: 1, agentId: 'agent-2' },
          },
          SYSTEM_LEAD_SCOPE,
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(tx.deal.create).not.toHaveBeenCalled();

      prisma.lead.findFirst.mockReset();
      prisma.lead.findFirst
        .mockResolvedValueOnce(workflowLead)
        .mockResolvedValue({ ...workflowLead, assignedUser: null });
      permissions.getPermissionKeysForUser.mockResolvedValue(
        keys(PERMISSIONS.LEAD_ASSIGN),
      );
      await service.moveStage(
        'lead-1',
        't',
        'u',
        {
          pipelineStageId: 'stage-won',
          deal: { unitType: 'Villa', price: 1, agentId: 'agent-2' },
        },
        SYSTEM_LEAD_SCOPE,
      );
      expect(tx.deal.create.mock.calls[0][0].data.agentId).toBe('agent-2');
    });

    it('cannot be recorded without deal.write', async () => {
      permissions.getPermissionKeysForUser.mockResolvedValue(
        new Set([PERMISSIONS.LEAD_UPDATE]),
      );
      await expect(
        service.moveStage(
          'lead-1',
          't',
          'u',
          {
            pipelineStageId: 'stage-won',
            deal: { unitType: 'Villa', price: 1 },
          },
          SYSTEM_LEAD_SCOPE,
        ),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('keeps the live deal when moving between Won stages', async () => {
      prisma.deal.findFirst.mockResolvedValue({
        id: 'deal-1',
        status: 'RESERVED',
      });
      prisma.lead.findFirst.mockReset();
      prisma.lead.findFirst
        .mockResolvedValueOnce({
          ...workflowLead,
          pipelineStageId: 'stage-won-old',
          pipelineStage: {
            id: 'stage-won-old',
            name: 'Sold',
            closeType: 'WON',
          },
        })
        .mockResolvedValue({ ...workflowLead, assignedUser: null });

      await service.moveStage(
        'lead-1',
        't',
        'u',
        { pipelineStageId: 'stage-won' },
        SYSTEM_LEAD_SCOPE,
      );
      expect(tx.lead.update).toHaveBeenCalled();
      expect(tx.deal.create).not.toHaveBeenCalled();
    });
  });

  describe('moveStage — leaving Won', () => {
    it('refuses while the lead has a live deal', async () => {
      prisma.deal.findFirst.mockResolvedValue({
        id: 'deal-1',
        status: 'CONTRACTED',
      });
      prisma.pipelineStage.findFirst.mockResolvedValue(OPEN_STAGE);

      await expect(
        service.moveStage(
          'lead-1',
          't',
          'u',
          { pipelineStageId: 'stage-next' },
          SYSTEM_LEAD_SCOPE,
        ),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'DEAL_ACTIVE' }),
      });
      expect(tx.lead.update).not.toHaveBeenCalled();
    });

    it('allows it once the deal is cancelled', async () => {
      prisma.deal.findFirst.mockResolvedValue(null);
      prisma.pipelineStage.findFirst.mockResolvedValue(OPEN_STAGE);

      await service.moveStage(
        'lead-1',
        't',
        'u',
        { pipelineStageId: 'stage-next' },
        SYSTEM_LEAD_SCOPE,
      );
      expect(tx.lead.update).toHaveBeenCalled();
    });
  });

  describe('reopenWonLeadInTx', () => {
    const wonLead = {
      ...workflowLead,
      pipelineStageId: 'stage-won',
      pipelineStage: { id: 'stage-won', name: 'Won', closeType: 'WON' },
    };
    const params = {
      tenantId: 't',
      actorUserId: 'manager-1',
      leadId: 'lead-1',
      dealId: 'deal-1',
      now: new Date('2026-11-17T10:00:00Z'),
    };

    it('moves the lead back to the stage it was won from', async () => {
      tx.lead.findFirst.mockResolvedValue(wonLead);
      tx.leadActivity.findFirst.mockResolvedValue({
        metadata: { fromStageId: 'stage-negotiation', toStageId: 'stage-won' },
      });
      tx.pipelineStage.findFirst.mockResolvedValue({
        id: 'stage-negotiation',
        name: 'Negotiation',
        isClosed: false,
        closeType: null,
      });

      const outcome = await service.reopenWonLeadInTx(tx as never, params);

      expect(tx.leadActivity.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: 'STAGE_CHANGED',
            metadata: { path: ['toStageId'], equals: 'stage-won' },
          }),
        }),
      );
      expect(outcome?.targetStage.id).toBe('stage-negotiation');
      const data = tx.lead.update.mock.calls[0][0].data;
      expect(data).toMatchObject({
        pipelineStageId: 'stage-negotiation',
        closedAt: null,
        lostReasonId: null,
        stageEnteredAt: params.now,
      });
      expect(activity.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'STAGE_CHANGED',
          metadata: expect.objectContaining({
            fromStageId: 'stage-won',
            toStageId: 'stage-negotiation',
            reason: 'DEAL_CANCELLED',
            dealId: 'deal-1',
          }),
        }),
        tx,
      );
      expect(lifecycle.cancelOpenTasks).not.toHaveBeenCalled();
    });

    it('falls back to the last open stage without history', async () => {
      tx.lead.findFirst.mockResolvedValue(wonLead);
      tx.leadActivity.findFirst.mockResolvedValue(null);
      tx.pipelineStage.findFirst.mockResolvedValue({
        id: 'stage-proposal',
        name: 'Proposal',
        isClosed: false,
        closeType: null,
      });

      const outcome = await service.reopenWonLeadInTx(tx as never, params);

      expect(tx.pipelineStage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ pipelineId: 'p', isClosed: false }),
          orderBy: { sortOrder: 'desc' },
        }),
      );
      expect(outcome?.targetStage.id).toBe('stage-proposal');
    });

    it('does nothing when the lead is not in a Won stage', async () => {
      tx.lead.findFirst.mockResolvedValue(workflowLead);

      await expect(
        service.reopenWonLeadInTx(tx as never, params),
      ).resolves.toBeNull();
      expect(tx.lead.update).not.toHaveBeenCalled();
    });
  });

  describe('assertBulkTargetAllowed', () => {
    it('rejects bulk wins and lets other stages through', async () => {
      prisma.pipelineStage.findFirst.mockResolvedValueOnce({
        closeType: 'WON',
      });
      await expect(
        service.assertBulkTargetAllowed('t', 'stage-won'),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          message: 'Win leads one at a time so each deal is recorded.',
        }),
      });

      prisma.pipelineStage.findFirst.mockResolvedValueOnce({
        closeType: 'LOST',
      });
      await expect(
        service.assertBulkTargetAllowed('t', 'stage-lost'),
      ).resolves.toBeUndefined();
    });
  });
});
