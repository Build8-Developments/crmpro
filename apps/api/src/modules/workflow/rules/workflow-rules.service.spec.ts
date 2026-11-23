import { NotificationType, TaskPriority, TaskStatus } from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import type { WorkflowSettings } from '../common/tenant-clock.service';
import { RULE_KEYS } from './rule-keys';
import { WorkflowRulesService } from './workflow-rules.service';

const cairo = (iso: string) => new Date(`${iso}+02:00`);

const settings: WorkflowSettings = {
  schedule: DEFAULT_WORK_SCHEDULE,
  firstContactSlaMinutes: 15,
  escalateAfterMinutes: 30,
  dailyInteractionGoal: 25,
};

function build() {
  const prisma = {
    lead: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    task: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'task-1' }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    leadActivity: { createMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  );
  const clock = { getWorkflowSettings: jest.fn().mockResolvedValue(settings) };
  const lifecycle = { refreshNextTaskDueAt: jest.fn() };
  const leadActivity = { createActivity: jest.fn() };
  const notifications = { trigger: jest.fn() };
  const managers = {
    forAssignee: jest.fn().mockResolvedValue(['manager-1']),
    distributors: jest.fn().mockResolvedValue(['manager-1', 'manager-2']),
  };
  const leadTimeRules = {
    closeLeftStageReviews: jest.fn().mockResolvedValue(0),
    closeReopenedReEngagements: jest.fn().mockResolvedValue(0),
    ensureStuckReviews: jest.fn().mockResolvedValue(0),
    ensureRevives: jest.fn().mockResolvedValue(0),
    ensureReEngagements: jest.fn().mockResolvedValue(0),
  };
  const dealRules = {
    ensurePaperwork: jest.fn().mockResolvedValue(0),
    escalateOverdueContracts: jest.fn().mockResolvedValue(0),
    ensureCheckIns: jest.fn().mockResolvedValue(0),
  };
  const service = new WorkflowRulesService(
    prisma as never,
    clock as never,
    lifecycle as never,
    leadActivity as never,
    notifications as never,
    managers as never,
    { register: jest.fn() } as never,
    { publish: jest.fn(), subscribe: jest.fn() } as never,
    leadTimeRules as never,
    dealRules as never,
  );
  return { service, prisma, notifications, managers, leadTimeRules, dealRules };
}

describe('WorkflowRulesService', () => {
  describe('R1 — first contact', () => {
    it('gives a lead assigned at night a first call due at opening + SLA', async () => {
      const { service, prisma } = build();
      prisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        fullName: 'Mona',
        assignedUserId: 'agent-1',
        assignedAt: cairo('2026-11-17T23:00:00'),
        firstContactedAt: null,
        source: { name: 'Facebook Ads' },
      });

      await service.ensureFirstContact('t', 'lead-1', settings);

      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assigneeId: 'agent-1',
            ruleKey: RULE_KEYS.FIRST_CONTACT,
            priority: TaskPriority.URGENT,
            title: 'First call — new lead from Facebook Ads',
            dueAt: cairo('2026-11-18T10:15:00'),
            escalateAt: cairo('2026-11-18T10:30:00'),
          }),
        }),
      );
    });

    it('restarts the clock for a new owner instead of adding a second task', async () => {
      const { service, prisma } = build();
      prisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        fullName: 'Mona',
        assignedUserId: 'agent-2',
        assignedAt: cairo('2026-11-17T11:00:00'),
        firstContactedAt: null,
        source: null,
      });
      prisma.task.findFirst.mockResolvedValue({
        id: 'task-1',
        assigneeId: 'agent-1',
      });

      await service.ensureFirstContact('t', 'lead-1', settings);

      expect(prisma.task.create).not.toHaveBeenCalled();
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          assigneeId: 'agent-2',
          dueAt: cairo('2026-11-17T11:15:00'),
          escalatedAt: null,
        }),
      });
    });

    it('does nothing for a lead that was already contacted', async () => {
      const { service, prisma } = build();
      prisma.lead.findFirst.mockResolvedValue({
        id: 'lead-1',
        assignedUserId: 'agent-1',
        firstContactedAt: new Date(),
      });
      await service.ensureFirstContact('t', 'lead-1', settings);
      expect(prisma.task.create).not.toHaveBeenCalled();
    });
  });

  describe('R7 — every open lead has a next step', () => {
    it('plans a follow-up for assigned leads without one', async () => {
      const { service, prisma } = build();
      prisma.lead.findMany.mockResolvedValue([
        { id: 'lead-1', assignedUserId: 'agent-1' },
        { id: 'lead-2', assignedUserId: 'agent-2' },
      ]);
      prisma.task.createMany.mockResolvedValue({ count: 2 });

      const created = await service.ensureNextSteps(
        't',
        settings,
        cairo('2026-11-20T09:00:00'), // Friday → Saturday 10:00 + 1 working hour
      );

      expect(created).toBe(2);
      const call = prisma.task.createMany.mock.calls[0][0] as {
        data: Array<{ ruleKey: string; dueAt: Date }>;
        skipDuplicates: boolean;
      };
      expect(call.skipDuplicates).toBe(true);
      expect(call.data.map((task) => task.ruleKey)).toEqual([
        RULE_KEYS.PLAN_NEXT_STEP,
        RULE_KEYS.PLAN_NEXT_STEP,
      ]);
      expect(call.data[0].dueAt).toEqual(cairo('2026-11-21T11:00:00'));
    });
  });

  describe('R7 — manager reviews', () => {
    it("does not count a manager review as the agent's next step", async () => {
      const { service, prisma } = build();
      await service.ensureNextSteps('t', settings, new Date());
      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tasks: {
              none: { status: TaskStatus.OPEN, type: { not: 'REVIEW' } },
            },
          }),
        }),
      );
    });
  });

  describe('sweep — R8–R12', () => {
    it('runs every rule and reports them in the result', async () => {
      const { service, leadTimeRules, dealRules } = build();
      leadTimeRules.ensureRevives.mockResolvedValue(3);
      leadTimeRules.ensureStuckReviews.mockResolvedValue(1);
      leadTimeRules.ensureReEngagements.mockResolvedValue(2);
      leadTimeRules.closeLeftStageReviews.mockResolvedValue(1);
      dealRules.ensurePaperwork.mockResolvedValue(1);
      dealRules.escalateOverdueContracts.mockResolvedValue(1);
      dealRules.ensureCheckIns.mockResolvedValue(4);

      const result = await service.sweepTenant('t', new Date());

      expect(result).toMatchObject({
        revived: 3,
        stuckReviews: 1,
        reEngaged: 2,
        autoClosed: 1,
        paperwork: 1,
        contractsEscalated: 1,
        checkIns: 4,
      });
    });

    it('keeps sweeping when one rule fails', async () => {
      const { service, leadTimeRules, dealRules } = build();
      leadTimeRules.ensureStuckReviews.mockRejectedValue(new Error('boom'));
      dealRules.ensureCheckIns.mockResolvedValue(2);

      const result = await service.sweepTenant('t', new Date());

      expect(result.stuckReviews).toBe(0);
      expect(result.checkIns).toBe(2);
      expect(leadTimeRules.ensureRevives).toHaveBeenCalled();
    });
  });

  describe('R13 — unassigned leads', () => {
    it('gives each distributor one rolling task', async () => {
      const { service, prisma } = build();
      prisma.lead.count.mockResolvedValue(3);
      prisma.lead.findFirst.mockResolvedValue({ createdAt: new Date() });
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-m1',
          assigneeId: 'manager-1',
          title: 'Assign 2 new leads',
          priority: TaskPriority.HIGH,
        },
      ]);

      await service.refreshAssignTask('t', settings, new Date());

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-m1' },
        data: { title: 'Assign 3 new leads', priority: TaskPriority.HIGH },
      });
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assigneeId: 'manager-2',
            ruleKey: RULE_KEYS.ASSIGN_NEW_LEADS,
          }),
        }),
      );
    });

    it('closes the task once the pool is empty', async () => {
      const { service, prisma } = build();
      prisma.lead.count.mockResolvedValue(0);
      prisma.lead.findFirst.mockResolvedValue(null);
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-m1',
          assigneeId: 'manager-1',
          title: 'x',
          priority: 'HIGH',
        },
      ]);

      await service.refreshAssignTask('t', settings, new Date());

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['task-m1'] } },
        data: expect.objectContaining({ status: TaskStatus.DONE }),
      });
    });
  });

  describe('SLA escalation', () => {
    it('alerts the managers once per missed first call', async () => {
      const { service, prisma, notifications } = build();
      prisma.task.findMany.mockImplementation(
        (args: { where: Record<string, unknown> }) =>
          Promise.resolve(
            'escalatedAt' in args.where
              ? [
                  {
                    id: 'task-1',
                    assigneeId: 'agent-1',
                    escalateAt: new Date(),
                    assignee: { name: 'Ahmed' },
                    lead: {
                      id: 'lead-1',
                      fullName: 'Mona',
                      assignedAt: new Date(),
                    },
                  },
                ]
              : [],
          ),
      );
      prisma.task.updateMany
        .mockResolvedValueOnce({ count: 0 }) // close satisfied first contacts
        .mockResolvedValueOnce({ count: 1 }); // claim escalation

      const result = await service.sweepTenant('t', new Date());

      expect(result.escalated).toBe(1);
      expect(notifications.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'manager-1',
          type: NotificationType.ESCALATION,
        }),
      );
    });

    it('skips a task another worker already escalated', async () => {
      const { service, prisma, notifications } = build();
      prisma.task.findMany.mockImplementation(
        (args: { where: Record<string, unknown> }) =>
          Promise.resolve(
            'escalatedAt' in args.where
              ? [
                  {
                    id: 'task-1',
                    assigneeId: 'agent-1',
                    assignee: { name: 'Ahmed' },
                    lead: { id: 'lead-1', fullName: 'Mona' },
                  },
                ]
              : [],
          ),
      );
      prisma.task.updateMany
        .mockResolvedValueOnce({ count: 0 })
        .mockResolvedValueOnce({ count: 0 });

      const result = await service.sweepTenant('t', new Date());

      expect(result.escalated).toBe(0);
      expect(notifications.trigger).not.toHaveBeenCalled();
    });
  });
});
