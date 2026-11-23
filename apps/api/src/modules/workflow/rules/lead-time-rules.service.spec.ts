import { TaskPriority, TaskStatus, TaskType } from '@crmpro/database';
import { DEFAULT_WORK_SCHEDULE } from '@crmpro/shared/workflow';
import type { WorkflowSettings } from '../common/tenant-clock.service';
import { LeadTimeRulesService } from './lead-time-rules.service';
import { RULE_KEYS } from './rule-keys';

const cairo = (iso: string) => new Date(`${iso}+02:00`);
const DAY = 86_400_000;

const settings: WorkflowSettings = {
  schedule: DEFAULT_WORK_SCHEDULE,
  firstContactSlaMinutes: 15,
  escalateAfterMinutes: 30,
  dailyInteractionGoal: 25,
};

/** Wednesday 12:00 Cairo — a working day, inside working hours. */
const NOW = cairo('2026-11-18T12:00:00');

type Counts = Record<string, number>;

function build() {
  const counts = {
    createdToday: {} as Counts,
    doneToday: {} as Counts,
    openDue: {} as Counts,
  };
  const prisma = {
    pipelineStage: { findMany: jest.fn().mockResolvedValue([]) },
    lostReason: { findMany: jest.fn().mockResolvedValue([]) },
    lead: { findMany: jest.fn().mockResolvedValue([]) },
    task: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      groupBy: jest.fn(({ where }: { where: Record<string, unknown> }) => {
        const source = where.ruleKey
          ? counts.createdToday
          : where.status === TaskStatus.DONE
            ? counts.doneToday
            : counts.openDue;
        return Promise.resolve(
          Object.entries(source).map(([assigneeId, n]) => ({
            assigneeId,
            _count: { _all: n },
          })),
        );
      }),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  );
  const lifecycle = { closeRuleTasks: jest.fn().mockResolvedValue(1) };
  const writer = { create: jest.fn().mockResolvedValue(true) };
  const managers = {
    reviewerFor: jest.fn().mockResolvedValue('manager-1'),
    distributors: jest.fn().mockResolvedValue(['distributor-1']),
  };
  const service = new LeadTimeRulesService(
    prisma as never,
    lifecycle as never,
    writer as never,
    managers as never,
  );
  return { service, prisma, lifecycle, writer, managers, counts };
}

function staleLead(
  id: string,
  overrides: Partial<{
    assignedUserId: string;
    heat: 'HOT' | 'WARM' | 'COLD';
    lastContactedAt: Date | null;
  }> = {},
) {
  return {
    id,
    assignedUserId: 'agent-1',
    heat: 'WARM' as const,
    lastContactedAt: new Date(NOW.getTime() - 10 * DAY),
    createdAt: new Date(NOW.getTime() - 60 * DAY),
    pipelineStageId: 'stage-contacted',
    ...overrides,
  };
}

const createdLeadIds = (writer: { create: jest.Mock }) =>
  writer.create.mock.calls.map(
    ([input]: [{ leadId: string; title: string }]) => input.leadId,
  );

describe('LeadTimeRulesService', () => {
  describe('R8 — revive stale leads', () => {
    it('creates a revive call per stage threshold, priority by heat', async () => {
      const { service, prisma, writer } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-contacted', staleAfterDays: 7 },
      ]);
      prisma.lead.findMany.mockResolvedValue([
        staleLead('lead-hot', { heat: 'HOT' }),
        staleLead('lead-cold', {
          heat: 'COLD',
          lastContactedAt: null,
        }),
      ]);

      const created = await service.ensureRevives('t', settings, NOW);

      expect(created).toBe(2);
      const where = prisma.lead.findMany.mock.calls[0][0].where;
      expect(where.AND[1].OR[0]).toEqual({
        pipelineStageId: 'stage-contacted',
        OR: [
          { lastContactedAt: { lt: new Date(NOW.getTime() - 7 * DAY) } },
          {
            lastContactedAt: null,
            createdAt: { lt: new Date(NOW.getTime() - 7 * DAY) },
          },
        ],
      });
      expect(writer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-hot',
          assigneeId: 'agent-1',
          type: TaskType.CALL,
          ruleKey: RULE_KEYS.REVIVE_STALE,
          priority: TaskPriority.HIGH,
          title: 'Revive — no contact for 10 days',
          // Sometime today: end of the working day.
          dueAt: cairo('2026-11-18T19:00:00'),
        }),
      );
      expect(writer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-cold',
          priority: TaskPriority.LOW,
          title: 'Revive — no contact for 60 days',
        }),
      );
    });

    it('does nothing outside working hours', async () => {
      const { service, prisma, writer } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-contacted', staleAfterDays: 7 },
      ]);
      prisma.lead.findMany.mockResolvedValue([staleLead('lead-1')]);

      const created = await service.ensureRevives(
        't',
        settings,
        cairo('2026-11-20T12:00:00'), // Friday: not a working day
      );

      expect(created).toBe(0);
      expect(writer.create).not.toHaveBeenCalled();
    });

    it('caps at 5 per agent per day, hottest then stalest first', async () => {
      const { service, prisma, writer, counts } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-contacted', staleAfterDays: 7 },
      ]);
      counts.createdToday = { 'agent-1': 2 }; // 3 left
      prisma.lead.findMany.mockResolvedValue([
        staleLead('warm-old', {
          lastContactedAt: new Date(NOW.getTime() - 30 * DAY),
        }),
        staleLead('warm-new'),
        staleLead('cold', { heat: 'COLD' }),
        staleLead('hot', { heat: 'HOT' }),
        staleLead('other-agent', { assignedUserId: 'agent-2' }),
      ]);

      const created = await service.ensureRevives('t', settings, NOW);

      expect(created).toBe(4);
      expect(createdLeadIds(writer)).toEqual([
        'hot',
        'warm-old',
        'warm-new',
        'other-agent',
      ]);
    });

    it('only fills the room left to the daily goal', async () => {
      const { service, prisma, writer, counts } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-contacted', staleAfterDays: 7 },
      ]);
      // goal 25: 20 done + 4 still due today → room for 1.
      counts.doneToday = { 'agent-1': 20 };
      counts.openDue = { 'agent-1': 4 };
      prisma.lead.findMany.mockResolvedValue([
        staleLead('lead-1'),
        staleLead('lead-2'),
      ]);

      const created = await service.ensureRevives('t', settings, NOW);

      expect(created).toBe(1);
      expect(writer.create).toHaveBeenCalledTimes(1);
    });

    it('does not repeat a skipped revive within the same stale period', async () => {
      const { service, prisma, writer } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-contacted', staleAfterDays: 7 },
      ]);
      prisma.lead.findMany.mockResolvedValue([
        staleLead('recently-revived'),
        staleLead('revived-long-ago'),
      ]);
      prisma.task.findMany.mockResolvedValue([
        {
          leadId: 'recently-revived',
          createdAt: new Date(NOW.getTime() - DAY),
        },
        {
          leadId: 'revived-long-ago',
          createdAt: new Date(NOW.getTime() - 9 * DAY),
        },
      ]);

      await service.ensureRevives('t', settings, NOW);

      expect(createdLeadIds(writer)).toEqual(['revived-long-ago']);
    });

    it('counts a concurrent duplicate as not created', async () => {
      const { service, prisma, writer } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-contacted', staleAfterDays: 7 },
      ]);
      prisma.lead.findMany.mockResolvedValue([staleLead('lead-1')]);
      writer.create.mockResolvedValue(false);

      expect(await service.ensureRevives('t', settings, NOW)).toBe(0);
    });

    it('is off when no stage has a threshold', async () => {
      const { service, prisma } = build();
      expect(await service.ensureRevives('t', settings, NOW)).toBe(0);
      expect(prisma.lead.findMany).not.toHaveBeenCalled();
    });
  });

  describe('R9 — stuck in stage', () => {
    const stuck = (id: string, days: number, assignedUserId = 'agent-1') => ({
      id,
      assignedUserId,
      stageEnteredAt: new Date(NOW.getTime() - days * DAY),
      pipelineStage: { name: 'Negotiation' },
    });

    it("gives the owner's manager a review task", async () => {
      const { service, prisma, writer, managers } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-negotiation', stuckAfterDays: 21 },
      ]);
      prisma.lead.findMany.mockResolvedValue([stuck('lead-1', 23)]);

      const created = await service.ensureStuckReviews('t', settings, NOW);

      expect(created).toBe(1);
      expect(managers.reviewerFor).toHaveBeenCalledWith('t', 'agent-1');
      expect(prisma.lead.findMany.mock.calls[0][0].where.OR).toEqual([
        {
          pipelineStageId: 'stage-negotiation',
          stageEnteredAt: { lt: new Date(NOW.getTime() - 21 * DAY) },
        },
      ]);
      expect(writer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          assigneeId: 'manager-1',
          type: TaskType.REVIEW,
          ruleKey: RULE_KEYS.STUCK_REVIEW,
          title: 'Stuck in Negotiation 23 days',
        }),
      );
    });

    it('caps new reviews at 5 per manager per day, longest-stuck first', async () => {
      const { service, prisma, writer, counts } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-negotiation', stuckAfterDays: 21 },
      ]);
      counts.createdToday = { 'manager-1': 3 };
      // Already ordered by stageEnteredAt (oldest first) by the query.
      prisma.lead.findMany.mockResolvedValue([
        stuck('lead-a', 60),
        stuck('lead-b', 40),
        stuck('lead-c', 30),
      ]);

      const created = await service.ensureStuckReviews('t', settings, NOW);

      expect(created).toBe(2);
      expect(createdLeadIds(writer)).toEqual(['lead-a', 'lead-b']);
      expect(prisma.lead.findMany.mock.calls[0][0].orderBy).toEqual({
        stageEnteredAt: 'asc',
      });
    });

    it('reviews a lead once per stage visit', async () => {
      const { service, prisma, writer } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-negotiation', stuckAfterDays: 21 },
      ]);
      prisma.lead.findMany.mockResolvedValue([stuck('lead-1', 30)]);
      prisma.task.findMany.mockResolvedValue([
        { leadId: 'lead-1', createdAt: new Date(NOW.getTime() - 5 * DAY) },
      ]);

      expect(await service.ensureStuckReviews('t', settings, NOW)).toBe(0);
      expect(writer.create).not.toHaveBeenCalled();
    });

    it('skips leads whose owner has no manager', async () => {
      const { service, prisma, writer, managers } = build();
      prisma.pipelineStage.findMany.mockResolvedValue([
        { id: 'stage-negotiation', stuckAfterDays: 21 },
      ]);
      prisma.lead.findMany.mockResolvedValue([stuck('lead-1', 30)]);
      managers.reviewerFor.mockResolvedValue(null);

      expect(await service.ensureStuckReviews('t', settings, NOW)).toBe(0);
      expect(writer.create).not.toHaveBeenCalled();
    });

    it('closes a review once the lead entered another stage', async () => {
      const { service, prisma } = build();
      const createdAt = new Date(NOW.getTime() - 2 * DAY);
      prisma.task.findMany.mockResolvedValue([
        {
          id: 'moved',
          createdAt,
          lead: { stageEnteredAt: new Date(NOW.getTime() - DAY) },
        },
        {
          id: 'still-stuck',
          createdAt,
          lead: { stageEnteredAt: new Date(NOW.getTime() - 30 * DAY) },
        },
      ]);
      prisma.task.updateMany.mockResolvedValue({ count: 1 });

      const closed = await service.closeLeftStageReviews('t', NOW);

      expect(closed).toBe(1);
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['moved'] }, status: TaskStatus.OPEN },
        data: { status: TaskStatus.DONE, completedAt: NOW },
      });
    });
  });

  describe('R12 — re-engage recyclable losses', () => {
    const lost = (
      id: string,
      lostDaysAgo: number,
      agent: { id: string | null; active: boolean } = {
        id: 'agent-1',
        active: true,
      },
    ) => ({
      id,
      closedAt: new Date(NOW.getTime() - lostDaysAgo * DAY),
      lostReasonId: 'postponed',
      assignedUserId: agent.id,
      assignedUser: agent.id
        ? { isActive: agent.active, deletedAt: null }
        : null,
    });

    it('looks only at losses whose recycle date is 0–14 days old', async () => {
      const { service, prisma } = build();
      prisma.lostReason.findMany.mockResolvedValue([
        { id: 'postponed', name: 'Postponed', recycleAfterDays: 90 },
      ]);

      await service.ensureReEngagements('t', settings, NOW);

      const where = prisma.lead.findMany.mock.calls[0][0].where;
      expect(where.pipelineStage).toEqual({ closeType: 'LOST' });
      expect(where.OR).toEqual([
        {
          lostReasonId: 'postponed',
          closedAt: {
            gte: new Date(NOW.getTime() - 104 * DAY),
            lte: new Date(NOW.getTime() - 90 * DAY),
          },
        },
      ]);
    });

    it('gives the original agent a re-engage call', async () => {
      const { service, prisma, writer } = build();
      prisma.lostReason.findMany.mockResolvedValue([
        { id: 'postponed', name: 'Postponed', recycleAfterDays: 90 },
      ]);
      prisma.lead.findMany.mockResolvedValue([lost('lead-1', 92)]);

      expect(await service.ensureReEngagements('t', settings, NOW)).toBe(1);
      expect(writer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          assigneeId: 'agent-1',
          type: TaskType.CALL,
          ruleKey: RULE_KEYS.RE_ENGAGE,
          title: 'Re-engage — lost 92 days ago (Postponed)',
        }),
      );
    });

    it('falls back to the manager, then a distributor, when the agent left', async () => {
      const { service, prisma, writer, managers } = build();
      prisma.lostReason.findMany.mockResolvedValue([
        { id: 'postponed', name: 'Postponed', recycleAfterDays: 90 },
      ]);
      prisma.lead.findMany.mockResolvedValue([
        lost('left-agent', 92, { id: 'agent-gone', active: false }),
        lost('never-assigned', 92, { id: null, active: false }),
      ]);
      managers.reviewerFor
        .mockResolvedValueOnce('manager-1')
        .mockResolvedValueOnce(null);

      await service.ensureReEngagements('t', settings, NOW);

      const assignees = writer.create.mock.calls.map(
        ([input]: [{ assigneeId: string }]) => input.assigneeId,
      );
      expect(assignees).toEqual(['manager-1', 'distributor-1']);
    });

    it('re-engages once per lost episode', async () => {
      const { service, prisma, writer } = build();
      prisma.lostReason.findMany.mockResolvedValue([
        { id: 'postponed', name: 'Postponed', recycleAfterDays: 90 },
      ]);
      prisma.lead.findMany.mockResolvedValue([
        lost('done-already', 95),
        lost('from-older-episode', 95),
      ]);
      prisma.task.findMany.mockResolvedValue([
        { leadId: 'done-already', createdAt: new Date(NOW.getTime() - DAY) },
        {
          leadId: 'from-older-episode',
          createdAt: new Date(NOW.getTime() - 400 * DAY),
        },
      ]);

      await service.ensureReEngagements('t', settings, NOW);

      expect(createdLeadIds(writer)).toEqual(['from-older-episode']);
    });

    it('caps re-engage calls at 5 per person per day', async () => {
      const { service, prisma, writer, counts } = build();
      prisma.lostReason.findMany.mockResolvedValue([
        { id: 'postponed', name: 'Postponed', recycleAfterDays: 90 },
      ]);
      counts.createdToday = { 'agent-1': 4 };
      prisma.lead.findMany.mockResolvedValue([
        lost('lead-1', 100),
        lost('lead-2', 95),
      ]);

      expect(await service.ensureReEngagements('t', settings, NOW)).toBe(1);
      expect(createdLeadIds(writer)).toEqual(['lead-1']);
    });

    it('marks re-engage done once the lead is back in an open stage', async () => {
      const { service, prisma, lifecycle } = build();
      prisma.task.findMany.mockResolvedValue([{ leadId: 'lead-1' }]);

      expect(await service.closeReopenedReEngagements('t', NOW)).toBe(1);
      expect(prisma.task.findMany.mock.calls[0][0].where).toMatchObject({
        ruleKey: RULE_KEYS.RE_ENGAGE,
        status: TaskStatus.OPEN,
        lead: { pipelineStage: { isClosed: false } },
      });
      expect(lifecycle.closeRuleTasks).toHaveBeenCalledWith(
        'lead-1',
        [RULE_KEYS.RE_ENGAGE],
        TaskStatus.DONE,
        prisma,
        NOW,
      );
    });
  });
});
