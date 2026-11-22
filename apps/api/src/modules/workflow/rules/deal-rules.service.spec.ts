import {
  NotificationType,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import type { WorkflowSettings } from '../common/tenant-clock.service';
import {
  CHECK_IN_TITLE,
  contractDeadline,
  DealRulesService,
  PAPERWORK_TITLE,
} from './deal-rules.service';
import { RULE_KEYS } from './rule-keys';

const cairo = (iso: string) => new Date(`${iso}+02:00`);
const DAY = 86_400_000;

const settings: WorkflowSettings = {
  schedule: DEFAULT_WORK_SCHEDULE,
  firstContactSlaMinutes: 15,
  escalateAfterMinutes: 30,
  dailyInteractionGoal: 25,
};

/** Wednesday 12:00 Cairo. */
const NOW = cairo('2026-11-18T12:00:00');

const activePeople = {
  agentId: 'agent-1',
  agent: { isActive: true, deletedAt: null },
  lead: {
    assignedUserId: 'owner-1',
    assignedUser: { isActive: true, deletedAt: null },
  },
};

function build() {
  const tx = {
    task: {
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const prisma = {
    deal: { findMany: jest.fn().mockResolvedValue([]) },
    task: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const clock = {
    getWorkflowSettings: jest.fn().mockResolvedValue(settings),
    getTimeZone: jest.fn().mockResolvedValue('Africa/Cairo'),
  };
  const lifecycle = { closeRuleTasks: jest.fn().mockResolvedValue(1) };
  const writer = {
    create: jest.fn().mockResolvedValue(true),
    createInTx: jest.fn().mockResolvedValue({ id: 'task-1' }),
  };
  const notifications = { trigger: jest.fn() };
  const managers = {
    forAssignee: jest.fn().mockResolvedValue(['manager-1', 'manager-2']),
    distributors: jest.fn().mockResolvedValue(['distributor-1']),
  };
  const service = new DealRulesService(
    prisma as never,
    clock as never,
    lifecycle as never,
    writer as never,
    notifications as never,
    managers as never,
  );
  return { service, tx, prisma, lifecycle, writer, notifications, managers };
}

describe('DealRulesService', () => {
  describe('R10 — paperwork on reservation', () => {
    it('creates the paperwork task in the deal transaction', async () => {
      const { service, tx, writer } = build();
      const reservedAt = cairo('2026-11-18T11:00:00');

      await service.onDealReserved(
        tx as never,
        {
          tenantId: 't',
          leadId: 'lead-1',
          assigneeId: 'agent-1',
          reservedAt,
          expectedContractAt: null,
        },
        NOW,
      );

      expect(writer.createInTx).toHaveBeenCalledWith(tx, {
        tenantId: 't',
        leadId: 'lead-1',
        assigneeId: 'agent-1',
        type: TaskType.PAPERWORK,
        title: PAPERWORK_TITLE,
        // Two working days (9h each) from Wednesday 12:00 → Saturday 12:00
        // (Friday is off).
        dueAt: cairo('2026-11-21T12:00:00'),
        // No contract date yet: reservation + 14 days.
        escalateAt: new Date(reservedAt.getTime() + 14 * DAY),
        priority: TaskPriority.HIGH,
        ruleKey: RULE_KEYS.DEAL_PAPERWORK,
      });
    });

    it('escalates at the end of the expected contract day when one is set', () => {
      const expectedContractAt = cairo('2026-12-01T12:00:00');
      expect(
        contractDeadline(
          { reservedAt: NOW, expectedContractAt },
          'Africa/Cairo',
        ),
      ).toEqual(cairo('2026-12-02T00:00:00'));
    });

    it('does not create a second open paperwork task', async () => {
      const { service, tx, writer } = build();
      tx.task.findFirst.mockResolvedValue({ id: 'existing' });

      await service.onDealReserved(
        tx as never,
        {
          tenantId: 't',
          leadId: 'lead-1',
          assigneeId: 'agent-1',
          reservedAt: NOW,
          expectedContractAt: null,
        },
        NOW,
      );

      expect(writer.createInTx).not.toHaveBeenCalled();
    });

    it('marks the paperwork done on contract and disarms the escalation', async () => {
      const { service, tx, lifecycle } = build();

      await service.onDealContracted(tx as never, 'lead-1', NOW);

      expect(lifecycle.closeRuleTasks).toHaveBeenCalledWith(
        'lead-1',
        [RULE_KEYS.DEAL_PAPERWORK],
        TaskStatus.DONE,
        tx,
        NOW,
      );
      expect(tx.task.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          leadId: 'lead-1',
          ruleKey: RULE_KEYS.DEAL_PAPERWORK,
          escalatedAt: null,
        }),
        data: { escalateAt: null },
      });
    });

    it('cancels paperwork and check-in when the deal is cancelled', async () => {
      const { service, tx, lifecycle } = build();

      await service.onDealCancelled(tx as never, 'lead-1', NOW);

      expect(lifecycle.closeRuleTasks).toHaveBeenCalledWith(
        'lead-1',
        [RULE_KEYS.DEAL_PAPERWORK, RULE_KEYS.DEAL_CHECK_IN],
        TaskStatus.CANCELLED,
        tx,
        NOW,
      );
    });

    it('moves and re-arms the escalation when the contract date changes', async () => {
      const { service, tx } = build();
      const expectedContractAt = cairo('2026-12-10T12:00:00');

      await service.onDealEdited(
        tx as never,
        {
          tenantId: 't',
          leadId: 'lead-1',
          status: 'RESERVED',
          reservedAt: NOW,
          expectedContractAt,
        },
        { deadlineChanged: true, newAgentId: 'agent-2' },
      );

      expect(tx.task.updateMany).toHaveBeenCalledWith({
        where: {
          leadId: 'lead-1',
          ruleKey: RULE_KEYS.DEAL_PAPERWORK,
          status: { not: TaskStatus.CANCELLED },
        },
        data: {
          escalateAt: cairo('2026-12-11T00:00:00'),
          escalatedAt: null,
        },
      });
      expect(tx.task.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          leadId: 'lead-1',
          status: TaskStatus.OPEN,
        }),
        data: { assigneeId: 'agent-2' },
      });
    });

    it('sweep: recreates paperwork only for recent deals without one', async () => {
      const { service, prisma, writer } = build();
      const reservedAt = new Date(NOW.getTime() - 3 * DAY);
      prisma.deal.findMany.mockResolvedValue([
        {
          id: 'deal-new',
          leadId: 'lead-new',
          reservedAt,
          expectedContractAt: null,
          ...activePeople,
        },
        {
          id: 'deal-has-task',
          leadId: 'lead-has-task',
          reservedAt,
          expectedContractAt: null,
          ...activePeople,
        },
      ]);
      prisma.task.findMany.mockResolvedValue([
        { leadId: 'lead-has-task', createdAt: reservedAt },
      ]);

      const created = await service.ensurePaperwork('t', settings, NOW);

      expect(created).toBe(1);
      const where = prisma.deal.findMany.mock.calls[0][0].where;
      expect(where).toMatchObject({
        tenantId: 't',
        status: 'RESERVED',
        reservedAt: { gte: new Date(NOW.getTime() - 14 * DAY) },
      });
      // Cancelled paperwork (e.g. a move between Won stages) does not count.
      expect(prisma.task.findMany.mock.calls[0][0].where).toMatchObject({
        status: { not: TaskStatus.CANCELLED },
      });
      expect(writer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-new',
          assigneeId: 'agent-1',
          ruleKey: RULE_KEYS.DEAL_PAPERWORK,
        }),
      );
    });

    it('sweep: falls back to the lead owner when the agent left', async () => {
      const { service, prisma, writer } = build();
      prisma.deal.findMany.mockResolvedValue([
        {
          id: 'deal-1',
          leadId: 'lead-1',
          reservedAt: NOW,
          expectedContractAt: null,
          ...activePeople,
          agent: { isActive: false, deletedAt: null },
        },
      ]);

      await service.ensurePaperwork('t', settings, NOW);

      expect(writer.create).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'owner-1' }),
      );
    });
  });

  describe('R10 — contract date passed', () => {
    const overdueTask = (deals: unknown[]) => ({
      id: 'task-1',
      assigneeId: 'agent-1',
      assignee: { name: 'Ahmed' },
      lead: { id: 'lead-1', fullName: 'Mona', deals },
    });

    it('tells the managers once while the deal is still reserved', async () => {
      const { service, prisma, notifications } = build();
      const expectedContractAt = new Date(NOW.getTime() - DAY);
      prisma.task.findMany.mockResolvedValue([
        overdueTask([{ id: 'deal-1', reservedAt: NOW, expectedContractAt }]),
      ]);

      const count = await service.escalateOverdueContracts('t', settings, NOW);

      expect(count).toBe(1);
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: 'task-1', escalatedAt: null },
        data: { escalatedAt: NOW },
      });
      expect(notifications.trigger).toHaveBeenCalledTimes(2);
      expect(notifications.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'manager-1',
          type: NotificationType.ESCALATION,
          metadata: expect.objectContaining({
            kind: 'contract_overdue',
            title: 'Contract date passed',
            dealId: 'deal-1',
          }),
          // Deadline = end of the expected day (tenant time).
          dedupeKey: `deal:deal-1:ESCALATION:manager-1:contract_overdue:${cairo('2026-11-18T00:00:00').toISOString()}`,
        }),
      );
    });

    it('skips a task another worker already escalated', async () => {
      const { service, prisma, notifications } = build();
      prisma.task.findMany.mockResolvedValue([
        overdueTask([
          { id: 'deal-1', reservedAt: NOW, expectedContractAt: null },
        ]),
      ]);
      prisma.task.updateMany.mockResolvedValue({ count: 0 });

      expect(await service.escalateOverdueContracts('t', settings, NOW)).toBe(
        0,
      );
      expect(notifications.trigger).not.toHaveBeenCalled();
    });

    it('disarms the task when the deal is no longer reserved', async () => {
      const { service, prisma, notifications } = build();
      prisma.task.findMany.mockResolvedValue([overdueTask([])]);

      expect(await service.escalateOverdueContracts('t', settings, NOW)).toBe(
        0,
      );
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: 'task-1', escalatedAt: null },
        data: { escalateAt: null },
      });
      expect(notifications.trigger).not.toHaveBeenCalled();
    });
  });

  describe('R11 — check-in 30 days after the contract', () => {
    it('only looks at contracts from 30 to 44 days ago', async () => {
      const { service, prisma } = build();

      await service.ensureCheckIns('t', settings, NOW);

      expect(prisma.deal.findMany.mock.calls[0][0].where).toMatchObject({
        tenantId: 't',
        status: 'CONTRACTED',
        contractedAt: {
          gte: new Date(NOW.getTime() - 44 * DAY),
          lte: new Date(NOW.getTime() - 30 * DAY),
        },
      });
    });

    it('creates one check-in call per deal', async () => {
      const { service, prisma, writer } = build();
      const contractedAt = new Date(NOW.getTime() - 31 * DAY);
      prisma.deal.findMany.mockResolvedValue([
        { id: 'deal-1', leadId: 'lead-1', contractedAt, ...activePeople },
        { id: 'deal-2', leadId: 'lead-2', contractedAt, ...activePeople },
      ]);
      prisma.task.findMany.mockResolvedValue([
        { leadId: 'lead-2', createdAt: new Date(NOW.getTime() - DAY) },
      ]);

      const created = await service.ensureCheckIns('t', settings, NOW);

      expect(created).toBe(1);
      expect(writer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          assigneeId: 'agent-1',
          type: TaskType.CALL,
          title: CHECK_IN_TITLE,
          priority: TaskPriority.NORMAL,
          ruleKey: RULE_KEYS.DEAL_CHECK_IN,
        }),
      );
    });
  });
});
