import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadHeat,
  NotificationType,
  Prisma,
  TaskStatus,
} from '@crmpro/database';
import { dayBoundsInZone } from '@crmpro/shared/workflow';
import {
  scopeUserIds,
  type LeadScope,
} from '../../../common/auth/lead-scope/lead-scope.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import {
  ASSIGNED_LEAD_WHERE,
  HOT_UNTOUCHED_HOURS,
  HOT_UNTOUCHED_LAST_CONTACT,
  lastContactWhere,
  loadStageThresholdRows,
  nextStepWhere,
  OPEN_LEAD_WHERE,
  slaBreachedWhere,
  stageStaleLeadWhere,
  stuckLeadWhere,
  toStageThresholds,
  UNASSIGNED_OPEN_LEAD_WHERE,
  type LeadStageThresholdRow,
} from '../../leads/utils/lead-filter-where.util';
import type { LeadStageThreshold } from '../../leads/types/lead.types';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../../notifications/utils/notification-dedupe.util';
import { withLeadScope } from '../queries/analytics-scope.util';
import {
  ATTENTION_TOP_AGENTS,
  NUDGE_AUDIT_ACTION,
  NUDGE_AUDIT_ENTITY,
  NUDGE_COOLDOWN_MS,
} from './dashboard-attention.constants';
import type {
  AttentionAgentRow,
  AttentionOverdueAgentRow,
  AttentionStageGroup,
  DashboardAttentionResponse,
  LeadsListQuery,
  NudgeAgentResult,
  NudgeKind,
} from './dashboard-attention.types';
import type { DashboardPeriod } from './dashboard-period';

/** `/leads?…` parameters per item — the web leads list reads these. */
const LIST = {
  slaBreachedToday: { slaBreached: 'today' },
  overdue: { nextStep: 'overdue' },
  hotUntouched: {
    heat: LeadHeat.HOT,
    lastContact: HOT_UNTOUCHED_LAST_CONTACT,
    openOnly: 'true',
  },
  noNextStep: { nextStep: 'none', assignedOnly: 'true' },
  stuck: { stuck: 'true' },
  stale: { stageStale: 'true' },
  unassigned: { unassigned: 'true' },
} satisfies Record<string, LeadsListQuery>;

const NUDGE_COPY: Record<
  NudgeKind,
  { title: string; message: (count: number, from: string) => string }
> = {
  overdue_tasks: {
    title: 'Overdue tasks need you',
    message: (count, from) =>
      `${from} asked you to catch up: you have ${count} overdue ${count === 1 ? 'task' : 'tasks'}.`,
  },
  hot_untouched: {
    title: 'Hot leads are waiting',
    message: (count, from) =>
      `${from} asked you to call your hot leads: ${count} ${count === 1 ? 'has' : 'have'} not been contacted for over ${HOT_UNTOUCHED_HOURS} hours.`,
  },
};

/**
 * Dashboard v2 §5.1 "Needs attention now": live counts (not tied to the
 * dashboard period) of what a manager should act on, each with the leads-list
 * query that shows the same leads, plus the "nudge agent" action.
 *
 * Every count uses the where-fragments of the leads list filters
 * (leads/utils/lead-filter-where.util.ts) and the caller's lead scope.
 */
@Injectable()
export class DashboardAttentionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationTriggerService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async get(
    tenantId: string,
    scope: LeadScope,
    period: DashboardPeriod,
  ): Promise<DashboardAttentionResponse> {
    const now = period.now;
    const today = dayBoundsInZone(now, period.timeZone);
    const leads = (...parts: Prisma.LeadWhereInput[]) =>
      scopedLeadWhere(tenantId, scope, parts);
    const hotWhere = leads(...hotUntouchedParts(now));

    const [
      slaBreaches,
      overdueTaskGroups,
      overdueLeadGroups,
      hotGroups,
      noNextStep,
      unassigned,
      stageRows,
    ] = await Promise.all([
      this.prisma.lead.count({ where: leads(slaBreachedWhere(today)) }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: overdueTaskWhere(tenantId, scope, now),
        _count: { _all: true },
        _min: { dueAt: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedUserId'],
        where: leads(nextStepWhere('overdue', now, today)),
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['assignedUserId'],
        where: hotWhere,
        _count: { _all: true },
      }),
      this.prisma.lead.count({
        where: leads(ASSIGNED_LEAD_WHERE, nextStepWhere('none', now, today)),
      }),
      this.prisma.lead.aggregate({
        where: leads(UNASSIGNED_OPEN_LEAD_WHERE),
        _count: { _all: true },
        _min: { createdAt: true },
      }),
      loadStageThresholdRows(this.prisma, tenantId),
    ]);

    const thresholds = toStageThresholds(stageRows);
    const [stuckGroups, staleGroups] = await Promise.all([
      this.countByStage(leads(stuckLeadWhere(thresholds.stuck, now))),
      this.countByStage(leads(stageStaleLeadWhere(thresholds.stale, now))),
    ]);

    const overdueLeadsByAgent = new Map<string | null, number>(
      overdueLeadGroups.map((group) => [
        group.assignedUserId,
        group._count._all,
      ]),
    );
    const topOverdue = [...overdueTaskGroups]
      .sort(
        (a, b) =>
          b._count._all - a._count._all ||
          (a._min.dueAt?.getTime() ?? 0) - (b._min.dueAt?.getTime() ?? 0),
      )
      .slice(0, ATTENTION_TOP_AGENTS);
    const topHot = hotGroups
      .filter(
        (group): group is typeof group & { assignedUserId: string } =>
          group.assignedUserId !== null,
      )
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, ATTENTION_TOP_AGENTS);

    const names = await this.userNames(tenantId, [
      ...topOverdue.map((group) => group.assigneeId),
      ...topHot.map((group) => group.assignedUserId),
    ]);

    const overdueByAgent: AttentionOverdueAgentRow[] = topOverdue.map(
      (group) => ({
        userId: group.assigneeId,
        name: names.get(group.assigneeId) ?? 'Unknown',
        taskCount: group._count._all,
        leadCount: overdueLeadsByAgent.get(group.assigneeId) ?? 0,
        oldestDueAt: (group._min.dueAt ?? now).toISOString(),
        listQuery: { ...LIST.overdue, assignees: group.assigneeId },
      }),
    );
    const hotByAgent: AttentionAgentRow[] = topHot.map((group) => ({
      userId: group.assignedUserId,
      name: names.get(group.assignedUserId) ?? 'Unknown',
      leadCount: group._count._all,
      listQuery: { ...LIST.hotUntouched, assignees: group.assignedUserId },
    }));

    return {
      periodApplies: false,
      generatedAt: now.toISOString(),
      timeZone: period.timeZone,
      slaBreachesToday: {
        count: slaBreaches,
        listQuery: LIST.slaBreachedToday,
      },
      overdueTasks: {
        taskCount: sum(overdueTaskGroups.map((group) => group._count._all)),
        leadCount: sum([...overdueLeadsByAgent.values()]),
        agentCount: overdueTaskGroups.length,
        listQuery: LIST.overdue,
        byAgent: overdueByAgent,
      },
      hotUntouched: {
        hours: HOT_UNTOUCHED_HOURS,
        count: sum(hotGroups.map((group) => group._count._all)),
        listQuery: LIST.hotUntouched,
        byAgent: hotByAgent,
      },
      noNextStep: { count: noNextStep, listQuery: LIST.noNextStep },
      stuck: stageGroup(stageRows, thresholds.stuck, stuckGroups, LIST.stuck),
      stale: stageGroup(stageRows, thresholds.stale, staleGroups, LIST.stale),
      unassigned: {
        count: unassigned._count._all,
        oldestCreatedAt: unassigned._min.createdAt?.toISOString() ?? null,
        listQuery: LIST.unassigned,
      },
    };
  }

  /**
   * Sends an agent an in-app reminder about their overdue tasks or untouched
   * hot leads. Managers (lead.assign) only, for agents inside their lead
   * scope, at most once per agent and kind per hour (whoever sent it).
   */
  async nudge(
    actor: AuthenticatedUser,
    scope: LeadScope,
    input: { userId: string; kind: NudgeKind },
    now = new Date(),
  ): Promise<NudgeAgentResult> {
    const { tenantId } = actor;
    const { userId, kind } = input;
    if (userId === actor.id) {
      throw new BadRequestException('You cannot nudge yourself');
    }

    // Out of scope behaves exactly like a missing user.
    const scopedIds = scopeUserIds(scope);
    const [agent, sender] = await Promise.all([
      scopedIds === null || scopedIds.includes(userId)
        ? this.prisma.user.findFirst({
            where: { id: userId, tenantId, deletedAt: null, isActive: true },
            select: { id: true, name: true },
          })
        : null,
      this.prisma.user.findFirst({
        where: { id: actor.id, tenantId },
        select: { name: true },
      }),
    ]);
    if (!agent) throw new NotFoundException('Agent not found');

    const result = (
      partial: Pick<NudgeAgentResult, 'sent' | 'reason' | 'count'>,
      nextAllowedAt: Date | null,
    ): NudgeAgentResult => ({
      ...partial,
      kind,
      userId,
      nextAllowedAt: nextAllowedAt?.toISOString() ?? null,
    });

    const count = await this.countForNudge(tenantId, userId, kind, now);
    if (count === 0) {
      return result({ sent: false, reason: 'NOTHING_TO_NUDGE', count }, null);
    }

    const recent = await this.prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: NUDGE_AUDIT_ACTION,
        entityType: NUDGE_AUDIT_ENTITY,
        entityId: userId,
        createdAt: { gt: new Date(now.getTime() - NUDGE_COOLDOWN_MS) },
        metadata: { path: ['kind'], equals: kind },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent) {
      return result(
        { sent: false, reason: 'ALREADY_NUDGED', count },
        new Date(recent.createdAt.getTime() + NUDGE_COOLDOWN_MS),
      );
    }

    const copy = NUDGE_COPY[kind];
    await this.notifications.trigger({
      tenantId,
      recipientUserId: userId,
      type: NotificationType.ESCALATION,
      createdByUserId: actor.id,
      metadata: {
        kind: `nudge_${kind}`,
        title: copy.title,
        message: copy.message(count, sender?.name ?? 'Your manager'),
        href: kind === 'overdue_tasks' ? '/today' : hotLeadsHref(userId),
        count,
        nudgedByUserId: actor.id,
      },
      // Backstop for double clicks; the audit check above is the hourly rule.
      dedupeKey: buildNotificationDedupeKey({
        entityType: 'user',
        entityId: userId,
        type: NotificationType.ESCALATION,
        recipientUserId: userId,
        suffix: `nudge:${kind}:${Math.floor(now.getTime() / NUDGE_COOLDOWN_MS)}`,
      }),
    });
    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId: actor.id,
      action: NUDGE_AUDIT_ACTION,
      entityType: NUDGE_AUDIT_ENTITY,
      entityId: userId,
      metadata: { kind, count, agentName: agent.name },
    });

    return result(
      { sent: true, reason: null, count },
      new Date(now.getTime() + NUDGE_COOLDOWN_MS),
    );
  }

  private countForNudge(
    tenantId: string,
    userId: string,
    kind: NudgeKind,
    now: Date,
  ): Promise<number> {
    if (kind === 'overdue_tasks') {
      return this.prisma.task.count({
        where: { ...overdueTaskBase(tenantId, now), assigneeId: userId },
      });
    }
    return this.prisma.lead.count({
      where: {
        tenantId,
        deletedAt: null,
        assignedUserId: userId,
        AND: hotUntouchedParts(now),
      },
    });
  }

  private async countByStage(
    where: Prisma.LeadWhereInput,
  ): Promise<Map<string, number>> {
    const groups = await this.prisma.lead.groupBy({
      by: ['pipelineStageId'],
      where,
      _count: { _all: true },
    });
    return new Map(
      groups.map((group) => [group.pipelineStageId, group._count._all]),
    );
  }

  private async userNames(
    tenantId: string,
    ids: string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { tenantId, id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(users.map((user) => [user.id, user.name]));
  }
}

function scopedLeadWhere(
  tenantId: string,
  scope: LeadScope,
  parts: Prisma.LeadWhereInput[],
): Prisma.LeadWhereInput {
  return withLeadScope({ tenantId, deletedAt: null, AND: parts }, scope);
}

/** Same filters as `?heat=HOT&lastContact=over_2d&openOnly=true`. */
function hotUntouchedParts(now: Date): Prisma.LeadWhereInput[] {
  return [
    OPEN_LEAD_WHERE,
    { heat: { in: [LeadHeat.HOT] } },
    lastContactWhere(HOT_UNTOUCHED_LAST_CONTACT, now),
  ];
}

function hotLeadsHref(userId: string): string {
  return `/leads?${new URLSearchParams({ ...LIST.hotUntouched, assignees: userId }).toString()}`;
}

/** Open tasks past due; tasks on deleted leads do not count. */
function overdueTaskBase(tenantId: string, now: Date): Prisma.TaskWhereInput {
  return {
    tenantId,
    status: TaskStatus.OPEN,
    dueAt: { lt: now },
    OR: [{ leadId: null }, { lead: { deletedAt: null } }],
  };
}

/** Overdue tasks of the people in scope (everyone for an unrestricted scope). */
function overdueTaskWhere(
  tenantId: string,
  scope: LeadScope,
  now: Date,
): Prisma.TaskWhereInput {
  const userIds = scopeUserIds(scope);
  return {
    ...overdueTaskBase(tenantId, now),
    ...(userIds === null ? {} : { assigneeId: { in: userIds } }),
  };
}

function stageGroup(
  rows: LeadStageThresholdRow[],
  thresholds: LeadStageThreshold[],
  counts: Map<string, number>,
  listQuery: LeadsListQuery,
): AttentionStageGroup {
  const days = new Map(thresholds.map((stage) => [stage.id, stage.days]));
  const byStage = rows
    .filter((row) => days.has(row.id) && (counts.get(row.id) ?? 0) > 0)
    .map((row) => ({
      stageId: row.id,
      stageName: row.name,
      pipelineName: row.pipelineName,
      thresholdDays: days.get(row.id)!,
      count: counts.get(row.id)!,
      listQuery: { ...listQuery, stageIds: row.id },
    }))
    .sort((a, b) => b.count - a.count);
  return {
    count: sum([...counts.values()]),
    listQuery,
    stagesConfigured: thresholds.length,
    byStage,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
