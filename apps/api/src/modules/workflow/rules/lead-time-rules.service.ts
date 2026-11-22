import { Injectable } from '@nestjs/common';
import {
  LeadStatus,
  PipelineCloseType,
  Prisma,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@crmpro/database';
import { dayBoundsInZone, isWorkingTime } from '@crmpro/shared/workflow';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TaskLifecycleService } from '../common/task-lifecycle.service';
import type { WorkflowSettings } from '../common/tenant-clock.service';
import { LeadManagersService } from './lead-managers.service';
import {
  RE_ENGAGE_DAILY_CAP,
  REVIVE_DAILY_CAP,
  RULE_CANDIDATE_BATCH,
  RULE_CATCH_UP_DAYS,
  RULE_KEYS,
  STUCK_REVIEW_DAILY_CAP,
} from './rule-keys';
import { RuleTaskWriter } from './rule-task-writer.service';
import {
  daysAgo,
  daysBetween,
  endOfWorkday,
  HEAT_RANK,
  OPEN_LEAD,
  PRIORITY_BY_HEAT,
  remaining,
} from './rule-utils';

type DayBounds = { start: Date; end: Date };

/**
 * Time-based lead rules run by the sweep (spec §3.2):
 * - R8 stale lead → "Revive" call for the owner (capped, toward the daily goal),
 * - R9 stuck in stage → manager review,
 * - R12 lost with a recyclable reason → "Re-engage" call after the delay.
 */
@Injectable()
export class LeadTimeRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: TaskLifecycleService,
    private readonly writer: RuleTaskWriter,
    private readonly managers: LeadManagersService,
  ) {}

  // ─── R8 — stale lead → "Revive" call ─────────────────────────────────

  /**
   * An open, assigned lead with no contact (or since creation, if never
   * contacted) for its stage's `staleAfterDays` and nothing planned before
   * the end of today gets a "Revive" call. These are suggestions toward the
   * daily goal (spec §3.4): per agent per local day at most
   * min(5, goal − tasks already on today's plan), hottest then stalest
   * first, and only during working hours.
   */
  async ensureRevives(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<number> {
    const { schedule } = settings;
    if (!isWorkingTime(now, schedule)) return 0;

    const stages = await this.prisma.pipelineStage.findMany({
      where: { tenantId, isClosed: false, staleAfterDays: { not: null } },
      select: { id: true, staleAfterDays: true },
    });
    if (stages.length === 0) return 0;
    const staleDays = new Map(
      stages.map((stage) => [stage.id, stage.staleAfterDays!]),
    );
    const today = dayBoundsInZone(now, schedule.timeZone);

    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        ...OPEN_LEAD,
        assignedUserId: { not: null },
        assignedUser: { isActive: true, deletedAt: null },
        tasks: {
          none: { status: TaskStatus.OPEN, ruleKey: RULE_KEYS.REVIVE_STALE },
        },
        AND: [
          // Nothing planned before the end of today.
          {
            OR: [
              { nextTaskDueAt: null },
              { nextTaskDueAt: { gte: today.end } },
            ],
          },
          {
            OR: stages.map((stage) => {
              const before = daysAgo(now, stage.staleAfterDays!);
              return {
                pipelineStageId: stage.id,
                OR: [
                  { lastContactedAt: { lt: before } },
                  { lastContactedAt: null, createdAt: { lt: before } },
                ],
              };
            }),
          },
        ],
      },
      select: {
        id: true,
        assignedUserId: true,
        heat: true,
        lastContactedAt: true,
        createdAt: true,
        pipelineStageId: true,
      },
      orderBy: [{ lastContactedAt: { sort: 'asc', nulls: 'first' } }],
      take: RULE_CANDIDATE_BATCH,
    });
    if (leads.length === 0) return 0;

    // Once per stale period: a skipped revive comes back after another
    // `staleAfterDays`, not on the next sweep.
    const lastRevive = await this.latestRuleTaskByLead(
      tenantId,
      RULE_KEYS.REVIVE_STALE,
      leads.map((lead) => lead.id),
    );
    const candidates = leads
      .map((lead) => ({
        ...lead,
        assigneeId: lead.assignedUserId!,
        quietSince: lead.lastContactedAt ?? lead.createdAt,
      }))
      .filter((lead) => {
        const previous = lastRevive.get(lead.id);
        if (!previous) return true;
        const days = staleDays.get(lead.pipelineStageId) ?? 0;
        const periodStart = new Date(
          Math.max(lead.quietSince.getTime(), daysAgo(now, days).getTime()),
        );
        return previous < periodStart;
      })
      // Hottest first, then the longest without contact.
      .sort(
        (a, b) =>
          HEAT_RANK[a.heat] - HEAT_RANK[b.heat] ||
          a.quietSince.getTime() - b.quietSince.getTime(),
      );
    if (candidates.length === 0) return 0;

    const budget = await this.reviveBudget(
      tenantId,
      [...new Set(candidates.map((lead) => lead.assigneeId))],
      settings.dailyInteractionGoal,
      today,
    );
    const dueAt = endOfWorkday(now, schedule);

    let created = 0;
    for (const lead of candidates) {
      if ((budget.get(lead.assigneeId) ?? 0) <= 0) continue;
      const days = daysBetween(lead.quietSince, now);
      const ok = await this.writer.create({
        tenantId,
        leadId: lead.id,
        assigneeId: lead.assigneeId,
        type: TaskType.CALL,
        title: `Revive — no contact for ${days} ${days === 1 ? 'day' : 'days'}`,
        dueAt,
        priority: PRIORITY_BY_HEAT[lead.heat],
        ruleKey: RULE_KEYS.REVIVE_STALE,
      });
      if (!ok) continue;
      budget.set(lead.assigneeId, (budget.get(lead.assigneeId) ?? 0) - 1);
      created += 1;
    }
    return created;
  }

  /**
   * Revives each agent may still get today: min(cap left, goal − plan),
   * where the plan is what Today counts (done today + open due by tonight).
   */
  private async reviveBudget(
    tenantId: string,
    agentIds: string[],
    goal: number,
    today: DayBounds,
  ): Promise<Map<string, number>> {
    const [createdToday, doneToday, openDue] = await Promise.all([
      this.countByAssignee({
        tenantId,
        assigneeId: { in: agentIds },
        ruleKey: RULE_KEYS.REVIVE_STALE,
        createdAt: { gte: today.start, lt: today.end },
      }),
      this.countByAssignee({
        tenantId,
        assigneeId: { in: agentIds },
        status: TaskStatus.DONE,
        completedAt: { gte: today.start, lt: today.end },
      }),
      this.countByAssignee({
        tenantId,
        assigneeId: { in: agentIds },
        status: TaskStatus.OPEN,
        dueAt: { lt: today.end },
      }),
    ]);
    return new Map(
      agentIds.map((agentId) => {
        const planned =
          (doneToday.get(agentId) ?? 0) + (openDue.get(agentId) ?? 0);
        return [
          agentId,
          Math.min(
            remaining(REVIVE_DAILY_CAP, createdToday.get(agentId)),
            remaining(goal, planned),
          ),
        ];
      }),
    );
  }

  // ─── R9 — stuck in stage → manager review ────────────────────────────

  /**
   * An open, assigned lead in its stage longer than `stuckAfterDays` gets a
   * REVIEW task for the owner's manager, once per stage visit. At most 5 new
   * reviews per manager per local day, longest-stuck first, so enabling the
   * rule does not flood anyone. Unassigned leads are R13's job.
   */
  async ensureStuckReviews(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<number> {
    const stages = await this.prisma.pipelineStage.findMany({
      where: { tenantId, isClosed: false, stuckAfterDays: { not: null } },
      select: { id: true, stuckAfterDays: true },
    });
    if (stages.length === 0) return 0;

    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        ...OPEN_LEAD,
        assignedUserId: { not: null },
        tasks: {
          none: { status: TaskStatus.OPEN, ruleKey: RULE_KEYS.STUCK_REVIEW },
        },
        OR: stages.map((stage) => ({
          pipelineStageId: stage.id,
          stageEnteredAt: { lt: daysAgo(now, stage.stuckAfterDays!) },
        })),
      },
      select: {
        id: true,
        assignedUserId: true,
        stageEnteredAt: true,
        pipelineStage: { select: { name: true } },
      },
      orderBy: { stageEnteredAt: 'asc' },
      take: RULE_CANDIDATE_BATCH,
    });
    if (leads.length === 0) return 0;

    // Once per stage visit: a review done or skipped is not repeated until
    // the lead enters a stage again.
    const lastReview = await this.latestRuleTaskByLead(
      tenantId,
      RULE_KEYS.STUCK_REVIEW,
      leads.map((lead) => lead.id),
    );
    const candidates = leads.filter((lead) => {
      const previous = lastReview.get(lead.id);
      return !previous || previous < lead.stageEnteredAt;
    });
    if (candidates.length === 0) return 0;

    const today = dayBoundsInZone(now, settings.schedule.timeZone);
    const reviewers = new Map<string, string | null>();
    for (const assigneeId of new Set(
      candidates.map((lead) => lead.assignedUserId!),
    )) {
      reviewers.set(
        assigneeId,
        await this.managers.reviewerFor(tenantId, assigneeId),
      );
    }
    const managerIds = [
      ...new Set([...reviewers.values()].filter((id): id is string => !!id)),
    ];
    if (managerIds.length === 0) return 0;
    const createdToday = await this.countByAssignee({
      tenantId,
      assigneeId: { in: managerIds },
      ruleKey: RULE_KEYS.STUCK_REVIEW,
      createdAt: { gte: today.start, lt: today.end },
    });
    const budget = new Map(
      managerIds.map((id) => [
        id,
        remaining(STUCK_REVIEW_DAILY_CAP, createdToday.get(id)),
      ]),
    );
    const dueAt = endOfWorkday(now, settings.schedule);

    let created = 0;
    for (const lead of candidates) {
      const managerId = reviewers.get(lead.assignedUserId!);
      if (!managerId || (budget.get(managerId) ?? 0) <= 0) continue;
      const days = daysBetween(lead.stageEnteredAt, now);
      const ok = await this.writer.create({
        tenantId,
        leadId: lead.id,
        assigneeId: managerId,
        type: TaskType.REVIEW,
        title: `Stuck in ${lead.pipelineStage.name} ${days} days`,
        dueAt,
        priority: TaskPriority.NORMAL,
        ruleKey: RULE_KEYS.STUCK_REVIEW,
      });
      if (!ok) continue;
      budget.set(managerId, (budget.get(managerId) ?? 0) - 1);
      created += 1;
    }
    return created;
  }

  /** The lead moved on (entered a stage after the review was raised): done. */
  async closeLeftStageReviews(tenantId: string, now: Date): Promise<number> {
    const open = await this.prisma.task.findMany({
      where: {
        tenantId,
        ruleKey: RULE_KEYS.STUCK_REVIEW,
        status: TaskStatus.OPEN,
      },
      select: {
        id: true,
        createdAt: true,
        lead: { select: { stageEnteredAt: true } },
      },
      take: 1000,
    });
    const moved = open
      .filter((task) => task.lead && task.lead.stageEnteredAt > task.createdAt)
      .map((task) => task.id);
    if (moved.length === 0) return 0;
    const result = await this.prisma.task.updateMany({
      where: { id: { in: moved }, status: TaskStatus.OPEN },
      data: { status: TaskStatus.DONE, completedAt: now },
    });
    return result.count;
  }

  // ─── R12 — lost with a recyclable reason → "Re-engage" ───────────────

  /**
   * A lead lost with a recyclable reason gets a "Re-engage" call once its
   * `recycleAfterDays` have passed — only while that moment is less than
   * 14 days old (no flood from old losses), once per lost episode. It goes
   * to the original agent while they are active, else to their manager or
   * a distributor. At most 5 per person per local day; the window lets the
   * rest follow on the next days. The lead stays Lost: the agent calls, and
   * if the client is interested moves the lead back to an open stage.
   */
  async ensureReEngagements(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<number> {
    const reasons = await this.prisma.lostReason.findMany({
      where: { tenantId, recyclable: true, recycleAfterDays: { gte: 1 } },
      select: { id: true, name: true, recycleAfterDays: true },
    });
    if (reasons.length === 0) return 0;
    const reasonNames = new Map(reasons.map((r) => [r.id, r.name]));

    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: LeadStatus.OPEN,
        pipelineStage: { closeType: PipelineCloseType.LOST },
        tasks: {
          none: { status: TaskStatus.OPEN, ruleKey: RULE_KEYS.RE_ENGAGE },
        },
        OR: reasons.map((reason) => ({
          lostReasonId: reason.id,
          closedAt: {
            gte: daysAgo(now, reason.recycleAfterDays! + RULE_CATCH_UP_DAYS),
            lte: daysAgo(now, reason.recycleAfterDays!),
          },
        })),
      },
      select: {
        id: true,
        closedAt: true,
        lostReasonId: true,
        assignedUserId: true,
        assignedUser: { select: { isActive: true, deletedAt: true } },
      },
      orderBy: { closedAt: 'asc' },
      take: RULE_CANDIDATE_BATCH,
    });
    if (leads.length === 0) return 0;

    // Once per lost episode: no re-engage created since the lead was lost.
    const lastReEngage = await this.latestRuleTaskByLead(
      tenantId,
      RULE_KEYS.RE_ENGAGE,
      leads.map((lead) => lead.id),
    );
    const candidates = leads.filter((lead) => {
      if (!lead.closedAt) return false;
      const previous = lastReEngage.get(lead.id);
      return !previous || previous < lead.closedAt;
    });
    if (candidates.length === 0) return 0;

    const fallback = new Map<string, string | null>();
    const assigneeOf = async (lead: (typeof candidates)[number]) => {
      const agentActive =
        lead.assignedUser?.isActive && lead.assignedUser.deletedAt === null;
      if (lead.assignedUserId && agentActive) return lead.assignedUserId;
      const key = lead.assignedUserId ?? '';
      if (!fallback.has(key)) {
        const reviewer = await this.managers.reviewerFor(
          tenantId,
          lead.assignedUserId,
        );
        fallback.set(
          key,
          reviewer ?? (await this.managers.distributors(tenantId))[0] ?? null,
        );
      }
      return fallback.get(key) ?? null;
    };

    const planned: Array<{ lead: (typeof candidates)[number]; to: string }> =
      [];
    for (const lead of candidates) {
      const to = await assigneeOf(lead);
      if (to) planned.push({ lead, to });
    }
    if (planned.length === 0) return 0;

    const today = dayBoundsInZone(now, settings.schedule.timeZone);
    const people = [...new Set(planned.map((item) => item.to))];
    const createdToday = await this.countByAssignee({
      tenantId,
      assigneeId: { in: people },
      ruleKey: RULE_KEYS.RE_ENGAGE,
      createdAt: { gte: today.start, lt: today.end },
    });
    const budget = new Map(
      people.map((id) => [
        id,
        remaining(RE_ENGAGE_DAILY_CAP, createdToday.get(id)),
      ]),
    );
    const dueAt = endOfWorkday(now, settings.schedule);

    let created = 0;
    for (const { lead, to } of planned) {
      if ((budget.get(to) ?? 0) <= 0) continue;
      const days = daysBetween(lead.closedAt!, now);
      const reason = reasonNames.get(lead.lostReasonId ?? '');
      const ok = await this.writer.create({
        tenantId,
        leadId: lead.id,
        assigneeId: to,
        type: TaskType.CALL,
        title: `Re-engage — lost ${days} days ago${reason ? ` (${reason})` : ''}`,
        dueAt,
        priority: TaskPriority.NORMAL,
        ruleKey: RULE_KEYS.RE_ENGAGE,
      });
      if (!ok) continue;
      budget.set(to, (budget.get(to) ?? 0) - 1);
      created += 1;
    }
    return created;
  }

  /** The lead was moved back to an open stage: re-engaging worked. */
  async closeReopenedReEngagements(
    tenantId: string,
    now: Date,
  ): Promise<number> {
    const reopened = await this.prisma.task.findMany({
      where: {
        tenantId,
        ruleKey: RULE_KEYS.RE_ENGAGE,
        status: TaskStatus.OPEN,
        lead: { pipelineStage: { isClosed: false } },
      },
      select: { leadId: true },
      take: 200,
    });
    let closed = 0;
    for (const leadId of new Set(reopened.map((task) => task.leadId))) {
      if (!leadId) continue;
      closed += await this.prisma.$transaction((tx) =>
        this.lifecycle.closeRuleTasks(
          leadId,
          [RULE_KEYS.RE_ENGAGE],
          TaskStatus.DONE,
          tx,
          now,
        ),
      );
    }
    return closed;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  /** When each lead last got a task from `ruleKey` (any status). */
  private async latestRuleTaskByLead(
    tenantId: string,
    ruleKey: string,
    leadIds: string[],
  ): Promise<Map<string, Date>> {
    const tasks = await this.prisma.task.findMany({
      where: { tenantId, ruleKey, leadId: { in: leadIds } },
      orderBy: { createdAt: 'desc' },
      distinct: ['leadId'],
      select: { leadId: true, createdAt: true },
    });
    return new Map(
      tasks
        .filter((task): task is { leadId: string; createdAt: Date } =>
          Boolean(task.leadId),
        )
        .map((task) => [task.leadId, task.createdAt]),
    );
  }

  private async countByAssignee(
    where: Prisma.TaskWhereInput,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.task.groupBy({
      by: ['assigneeId'],
      where,
      _count: { _all: true },
    });
    return new Map(
      rows.map((row) => [
        row.assigneeId,
        typeof row._count === 'object' ? (row._count._all ?? 0) : 0,
      ]),
    );
  }
}
