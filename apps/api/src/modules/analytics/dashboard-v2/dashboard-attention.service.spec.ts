import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { DashboardAttentionService } from './dashboard-attention.service';
import { NUDGE_AUDIT_ACTION } from './dashboard-attention.constants';
import { resolveDashboardPeriod } from './dashboard-period';

const TENANT = 'tenant-1';
const NOW = new Date('2026-11-18T10:00:00.000Z');
const DAY = 86_400_000;
const period = resolveDashboardPeriod('this-month', 'Africa/Cairo', NOW);

const all: LeadScope = { kind: 'all', actorUserId: 'owner-1' };
const team: LeadScope = {
  kind: 'team',
  actorUserId: 'manager-1',
  userIds: ['manager-1', 'agent-1', 'agent-2'],
};

const stageRows = [
  {
    id: 'stage-qualified',
    name: 'Qualified',
    pipelineId: 'pipe-1',
    stuckAfterDays: 21,
    staleAfterDays: 7,
    pipeline: { name: 'Sales' },
  },
  {
    id: 'stage-new',
    name: 'New Lead',
    pipelineId: 'pipe-1',
    stuckAfterDays: null,
    staleAfterDays: 3,
    pipeline: { name: 'Sales' },
  },
];

function createPrisma() {
  return {
    lead: {
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      aggregate: jest
        .fn()
        .mockResolvedValue({ _count: { _all: 0 }, _min: { createdAt: null } }),
    },
    task: {
      groupBy: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    pipelineStage: { findMany: jest.fn().mockResolvedValue(stageRows) },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
    },
    auditLog: { findFirst: jest.fn().mockResolvedValue(null) },
  };
}

type Where = Record<string, unknown>;

/** The `where` of every lead.groupBy call, keyed by the grouped column. */
function groupByWheres(prisma: ReturnType<typeof createPrisma>) {
  return (
    prisma.lead.groupBy.mock.calls as Array<[{ by: string[]; where: Where }]>
  ).map(([args]) => args);
}

describe('DashboardAttentionService', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let notifications: { trigger: jest.Mock };
  let audit: { createAuditLog: jest.Mock };
  let service: DashboardAttentionService;

  beforeEach(() => {
    prisma = createPrisma();
    notifications = { trigger: jest.fn().mockResolvedValue(undefined) };
    audit = { createAuditLog: jest.fn().mockResolvedValue(undefined) };
    service = new DashboardAttentionService(
      prisma as never,
      notifications as never,
      audit as never,
    );
  });

  describe('get', () => {
    it('returns live counts with the leads-list query behind each', async () => {
      prisma.lead.count
        .mockResolvedValueOnce(3) // SLA breaches today
        .mockResolvedValueOnce(5); // no next step
      prisma.task.groupBy.mockResolvedValue([
        {
          assigneeId: 'agent-1',
          _count: { _all: 2 },
          _min: { dueAt: new Date(NOW.getTime() - DAY) },
        },
        {
          assigneeId: 'agent-2',
          _count: { _all: 7 },
          _min: { dueAt: new Date(NOW.getTime() - 3 * DAY) },
        },
      ]);
      prisma.lead.groupBy.mockImplementation(
        ({ by, where }: { by: string[]; where: Where }) => {
          const json = JSON.stringify(where);
          if (by[0] === 'pipelineStageId') {
            return Promise.resolve(
              json.includes('stageEnteredAt')
                ? [{ pipelineStageId: 'stage-qualified', _count: { _all: 4 } }]
                : [
                    { pipelineStageId: 'stage-new', _count: { _all: 6 } },
                    { pipelineStageId: 'stage-qualified', _count: { _all: 1 } },
                  ],
            );
          }
          if (json.includes('"heat"')) {
            return Promise.resolve([
              { assignedUserId: 'agent-1', _count: { _all: 3 } },
              { assignedUserId: null, _count: { _all: 1 } },
            ]);
          }
          return Promise.resolve([
            { assignedUserId: 'agent-1', _count: { _all: 2 } },
            { assignedUserId: 'agent-2', _count: { _all: 4 } },
          ]);
        },
      );
      prisma.lead.aggregate.mockResolvedValue({
        _count: { _all: 2 },
        _min: { createdAt: new Date('2026-11-17T08:00:00.000Z') },
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'agent-1', name: 'Omar' },
        { id: 'agent-2', name: 'Yasmin' },
      ]);

      const result = await service.get(TENANT, all, period);

      expect(result.periodApplies).toBe(false);
      expect(result.slaBreachesToday).toEqual({
        count: 3,
        listQuery: { slaBreached: 'today' },
      });
      expect(result.overdueTasks).toMatchObject({
        taskCount: 9,
        leadCount: 6,
        agentCount: 2,
        listQuery: { nextStep: 'overdue' },
      });
      // Most overdue tasks first.
      expect(result.overdueTasks.byAgent.map((row) => row.name)).toEqual([
        'Yasmin',
        'Omar',
      ]);
      expect(result.overdueTasks.byAgent[0]).toMatchObject({
        userId: 'agent-2',
        taskCount: 7,
        leadCount: 4,
        listQuery: { nextStep: 'overdue', assignees: 'agent-2' },
      });
      expect(result.hotUntouched).toMatchObject({
        hours: 48,
        count: 4,
        listQuery: { heat: 'HOT', lastContact: 'over_2d', openOnly: 'true' },
      });
      // Unassigned hot leads count in the total but not per agent.
      expect(result.hotUntouched.byAgent).toEqual([
        {
          userId: 'agent-1',
          name: 'Omar',
          leadCount: 3,
          listQuery: {
            heat: 'HOT',
            lastContact: 'over_2d',
            openOnly: 'true',
            assignees: 'agent-1',
          },
        },
      ]);
      expect(result.noNextStep).toEqual({
        count: 5,
        listQuery: { nextStep: 'none', assignedOnly: 'true' },
      });
      expect(result.stuck).toEqual({
        count: 4,
        listQuery: { stuck: 'true' },
        stagesConfigured: 1,
        byStage: [
          {
            stageId: 'stage-qualified',
            stageName: 'Qualified',
            pipelineName: 'Sales',
            thresholdDays: 21,
            count: 4,
            listQuery: { stuck: 'true', stageIds: 'stage-qualified' },
          },
        ],
      });
      expect(result.stale.count).toBe(7);
      expect(result.stale.stagesConfigured).toBe(2);
      expect(result.stale.byStage.map((row) => row.stageId)).toEqual([
        'stage-new',
        'stage-qualified',
      ]);
      expect(result.unassigned).toEqual({
        count: 2,
        oldestCreatedAt: '2026-11-17T08:00:00.000Z',
        listQuery: { unassigned: 'true' },
      });
    });

    it('uses each stage’s own stuck / stale threshold', async () => {
      await service.get(TENANT, all, period);

      const byStage = groupByWheres(prisma).filter(
        (args) => args.by[0] === 'pipelineStageId',
      );
      const [stuck, stale] = byStage.map(
        (args) => (args.where.AND as Where[])[0],
      );
      expect(stuck.OR).toEqual([
        {
          pipelineStageId: 'stage-qualified',
          stageEnteredAt: { lt: new Date(NOW.getTime() - 21 * DAY) },
        },
      ]);
      expect((stale.OR as Where[]).map((part) => part.pipelineStageId)).toEqual(
        ['stage-qualified', 'stage-new'],
      );
      expect((stale.OR as Where[])[1].OR).toEqual([
        { lastContactedAt: { lt: new Date(NOW.getTime() - 3 * DAY) } },
        {
          lastContactedAt: null,
          createdAt: { lt: new Date(NOW.getTime() - 3 * DAY) },
        },
      ]);
    });

    it('matches no lead when no stage has a stuck threshold', async () => {
      prisma.pipelineStage.findMany.mockResolvedValue([stageRows[1]]);

      const result = await service.get(TENANT, all, period);

      expect(result.stuck.stagesConfigured).toBe(0);
      const stuckWhere = groupByWheres(prisma).find(
        (args) =>
          args.by[0] === 'pipelineStageId' &&
          JSON.stringify(args.where).includes('"in":[]'),
      );
      expect(stuckWhere).toBeDefined();
    });

    it('counts SLA breaches within the workspace day', async () => {
      await service.get(TENANT, all, period);

      const [{ where }] = prisma.lead.count.mock.calls[0] as [{ where: Where }];
      expect(where).toMatchObject({ tenantId: TENANT, deletedAt: null });
      // 2026-11-18 in Cairo (UTC+2) starts at 2026-11-17T22:00Z.
      expect((where.AND as Where[])[0]).toEqual({
        slaBreachedAt: {
          gte: new Date('2026-11-17T22:00:00.000Z'),
          lt: new Date('2026-11-18T22:00:00.000Z'),
        },
      });
    });

    it('restricts every query to a team scope', async () => {
      await service.get(TENANT, team, period);

      const scopeClause = {
        OR: [
          { assignedUserId: { in: team.userIds } },
          { assignedUserId: null },
        ],
      };
      for (const [{ where }] of [
        ...prisma.lead.count.mock.calls,
        ...prisma.lead.groupBy.mock.calls,
        ...prisma.lead.aggregate.mock.calls,
      ] as Array<[{ where: Where }]>) {
        expect(where.tenantId).toBe(TENANT);
        expect(where.AND).toEqual(expect.arrayContaining([scopeClause]));
      }
      const [{ where: taskWhere }] = prisma.task.groupBy.mock.calls[0] as [
        { where: Where },
      ];
      expect(taskWhere).toMatchObject({
        tenantId: TENANT,
        status: 'OPEN',
        dueAt: { lt: NOW },
        assigneeId: { in: team.userIds },
      });
    });

    it('does not restrict an unrestricted scope', async () => {
      await service.get(TENANT, all, period);

      const [{ where: taskWhere }] = prisma.task.groupBy.mock.calls[0] as [
        { where: Where },
      ];
      expect(taskWhere.assigneeId).toBeUndefined();
      const [{ where }] = prisma.lead.count.mock.calls[0] as [{ where: Where }];
      expect(where.AND).toHaveLength(1);
    });
  });

  describe('nudge', () => {
    const manager = {
      id: 'manager-1',
      tenantId: TENANT,
      roleId: 'role',
      sessionId: 's',
    };

    beforeEach(() => {
      prisma.user.findFirst.mockImplementation(
        ({ where }: { where: { id: string } }) =>
          Promise.resolve(
            where.id === 'agent-1'
              ? { id: 'agent-1', name: 'Omar' }
              : where.id === 'manager-1'
                ? { name: 'Sara' }
                : null,
          ),
      );
    });

    it('refuses to nudge yourself', async () => {
      await expect(
        service.nudge(
          manager,
          team,
          { userId: 'manager-1', kind: 'overdue_tasks' },
          NOW,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('treats agents outside the scope as missing', async () => {
      await expect(
        service.nudge(
          manager,
          team,
          { userId: 'agent-9', kind: 'overdue_tasks' },
          NOW,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.findFirst).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'agent-9' }),
        }),
      );
      expect(notifications.trigger).not.toHaveBeenCalled();
    });

    it('refuses inactive or unknown agents', async () => {
      await expect(
        service.nudge(
          manager,
          all,
          { userId: 'agent-2', kind: 'overdue_tasks' },
          NOW,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'agent-2',
            tenantId: TENANT,
            deletedAt: null,
            isActive: true,
          }),
        }),
      );
    });

    it('sends nothing when the agent has nothing overdue', async () => {
      prisma.task.count.mockResolvedValue(0);

      const result = await service.nudge(
        manager,
        team,
        { userId: 'agent-1', kind: 'overdue_tasks' },
        NOW,
      );

      expect(result).toMatchObject({
        sent: false,
        reason: 'NOTHING_TO_NUDGE',
        count: 0,
      });
      expect(notifications.trigger).not.toHaveBeenCalled();
      expect(audit.createAuditLog).not.toHaveBeenCalled();
    });

    it('sends at most one nudge per agent and kind per hour', async () => {
      prisma.task.count.mockResolvedValue(4);
      const earlier = new Date(NOW.getTime() - 20 * 60_000);
      prisma.auditLog.findFirst.mockResolvedValue({ createdAt: earlier });

      const result = await service.nudge(
        manager,
        team,
        { userId: 'agent-1', kind: 'overdue_tasks' },
        NOW,
      );

      expect(result).toEqual({
        sent: false,
        reason: 'ALREADY_NUDGED',
        kind: 'overdue_tasks',
        userId: 'agent-1',
        count: 4,
        nextAllowedAt: new Date(earlier.getTime() + 3_600_000).toISOString(),
      });
      expect(prisma.auditLog.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT,
            action: NUDGE_AUDIT_ACTION,
            entityType: 'User',
            entityId: 'agent-1',
            createdAt: { gt: new Date(NOW.getTime() - 3_600_000) },
            metadata: { path: ['kind'], equals: 'overdue_tasks' },
          },
        }),
      );
      expect(notifications.trigger).not.toHaveBeenCalled();
    });

    it('notifies the agent and audits the nudge', async () => {
      prisma.task.count.mockResolvedValue(4);

      const result = await service.nudge(
        manager,
        team,
        { userId: 'agent-1', kind: 'overdue_tasks' },
        NOW,
      );

      expect(result).toMatchObject({ sent: true, reason: null, count: 4 });
      expect(prisma.task.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: TENANT,
          status: 'OPEN',
          dueAt: { lt: NOW },
          assigneeId: 'agent-1',
        }),
      });
      expect(notifications.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT,
          recipientUserId: 'agent-1',
          type: NotificationType.ESCALATION,
          createdByUserId: 'manager-1',
          metadata: expect.objectContaining({
            kind: 'nudge_overdue_tasks',
            href: '/today',
            count: 4,
            message: expect.stringContaining('Sara'),
          }),
          dedupeKey: expect.stringContaining('nudge:overdue_tasks:'),
        }),
      );
      expect(audit.createAuditLog).toHaveBeenCalledWith({
        tenantId: TENANT,
        actorUserId: 'manager-1',
        action: NUDGE_AUDIT_ACTION,
        entityType: 'User',
        entityId: 'agent-1',
        metadata: { kind: 'overdue_tasks', count: 4, agentName: 'Omar' },
      });
    });

    it('counts the agent’s untouched hot leads for a hot-lead nudge', async () => {
      prisma.lead.count.mockResolvedValue(2);

      const result = await service.nudge(
        manager,
        all,
        { userId: 'agent-1', kind: 'hot_untouched' },
        NOW,
      );

      expect(result.sent).toBe(true);
      const [{ where }] = prisma.lead.count.mock.calls[0] as [{ where: Where }];
      expect(where).toMatchObject({
        tenantId: TENANT,
        deletedAt: null,
        assignedUserId: 'agent-1',
      });
      expect(JSON.stringify(where)).toContain('"HOT"');
      expect(notifications.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            kind: 'nudge_hot_untouched',
            href: '/leads?heat=HOT&lastContact=over_2d&openOnly=true&assignees=agent-1',
          }),
        }),
      );
    });
  });
});
