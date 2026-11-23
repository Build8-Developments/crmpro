import { Injectable } from '@nestjs/common';
import {
  InteractionChannel,
  InteractionOutcome,
  LeadHeat,
  LeadStatus,
  Prisma,
  TaskStatus,
  TaskType,
} from '@crmpro/database';
import {
  atLocalTime,
  dayBoundsInZone,
  getZonedParts,
  zonedTimeToUtc,
} from '@crmpro/shared/workflow';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { taskSelect, toTaskResponse } from '../common/workflow.mappers';
import { TenantClockService } from '../common/tenant-clock.service';
import { RULE_KEYS } from '../rules/rule-keys';
import type { SuggestedLead, TodayResponse, TodayTask } from './today.types';

const STREAK_LOOKBACK_DAYS = 45;
const STREAK_THRESHOLD = 0.8;
const UPCOMING_DAYS = 3;
const MAX_SUGGESTIONS = 5;
const DAY_MS = 86_400_000;
/** Scheduled appointments shown from tomorrow morning, until this hour. */
const TOMORROW_MORNING_HOUR = 12;

const PRIORITY_RANK = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const;
const HEAT_RANK: Record<LeadHeat, number> = { HOT: 0, WARM: 1, COLD: 2 };

const APPOINTMENT_TYPES: TaskType[] = [TaskType.MEETING, TaskType.SITE_VISIT];
const VISIT_OUTCOMES: InteractionOutcome[] = [InteractionOutcome.VISIT_DONE];

type TaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

/**
 * The agent's day (spec §4): what to do now, in what order, and how the day
 * and month are going. Everything is the caller's own work.
 */
@Injectable()
export class TodayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TenantClockService,
  ) {}

  async getToday(
    user: AuthenticatedUser,
    now = new Date(),
  ): Promise<TodayResponse> {
    const tenantId = user.tenantId;
    const settings = await this.clock.getWorkflowSettings(tenantId);
    const { timeZone } = settings.schedule;
    const today = dayBoundsInZone(now, timeZone);
    const parts = getZonedParts(now, timeZone);
    const tomorrowNoon = atLocalTime(
      now,
      1,
      TOMORROW_MORNING_HOUR,
      0,
      timeZone,
    );
    const upcomingUntil = dayBoundsInZone(
      atLocalTime(now, UPCOMING_DAYS, 12, 0, timeZone),
      timeZone,
    ).end;
    const monthStart = zonedTimeToUtc(
      parts.year,
      parts.month,
      1,
      0,
      0,
      timeZone,
    );

    const [me, openTasks, doneToday, interactionsToday] = await Promise.all([
      this.prisma.user.findFirstOrThrow({
        where: { id: user.id, tenantId },
        select: { id: true, name: true, createdAt: true },
      }),
      this.prisma.task.findMany({
        where: {
          tenantId,
          assigneeId: user.id,
          status: TaskStatus.OPEN,
          dueAt: { lt: upcomingUntil },
        },
        select: taskSelect,
        orderBy: { dueAt: 'asc' },
        take: 500,
      }),
      this.prisma.task.count({
        where: {
          tenantId,
          assigneeId: user.id,
          status: TaskStatus.DONE,
          completedAt: { gte: today.start, lt: today.end },
        },
      }),
      this.prisma.interaction.groupBy({
        by: ['channel'],
        where: {
          tenantId,
          userId: user.id,
          occurredAt: { gte: today.start, lt: today.end },
        },
        _count: { _all: true },
      }),
    ]);

    const context = await this.loadContext(
      openTasks.map((task) => task.leadId).filter((id): id is string => !!id),
    );
    const toToday = (task: TaskRecord): TodayTask => ({
      ...toTaskResponse(task, now),
      context: task.leadId ? (context.get(task.leadId) ?? null) : null,
    });

    const speedToLead: TodayTask[] = [];
    const overdue: TodayTask[] = [];
    const scheduled: TodayTask[] = [];
    const followUps: TodayTask[] = [];
    const upcoming: TodayTask[] = [];
    for (const record of openTasks) {
      const task = toToday(record);
      if (task.ruleKey === RULE_KEYS.FIRST_CONTACT) speedToLead.push(task);
      else if (
        APPOINTMENT_TYPES.includes(task.type) &&
        task.dueAt >= now &&
        task.dueAt < tomorrowNoon
      )
        scheduled.push(task);
      else if (task.dueAt < now) overdue.push(task);
      else if (task.dueAt < today.end) followUps.push(task);
      else upcoming.push(task);
    }
    const byUrgency = (a: TodayTask, b: TodayTask) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      heatRank(a) - heatRank(b) ||
      a.dueAt.getTime() - b.dueAt.getTime();
    overdue.sort(byUrgency);
    followUps.sort(
      (a, b) => a.dueAt.getTime() - b.dueAt.getTime() || byUrgency(a, b),
    );

    const soonAppointment = scheduled.find(
      (task) => task.dueAt.getTime() - now.getTime() <= 60 * 60_000,
    );
    const upNext =
      speedToLead[0] ?? soonAppointment ?? overdue[0] ?? followUps[0] ?? null;
    // The "Up next" card is not repeated in its section.
    const withoutUpNext = (list: TodayTask[]) =>
      upNext ? list.filter((task) => task.id !== upNext.id) : list;

    const openDueToday = openTasks.filter(
      (task) => task.dueAt < today.end,
    ).length;
    const planned = doneToday + openDueToday;

    const counts = new Map(
      interactionsToday.map((row) => [row.channel, row._count._all]),
    );
    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);

    const [streak, suggested, month, allTime] = await Promise.all([
      this.computeStreak(
        user,
        settings.schedule.workingDays,
        timeZone,
        now,
        today,
      ),
      this.suggest(
        user,
        Math.max(0, settings.dailyInteractionGoal - planned),
        today.end,
        now,
      ),
      this.monthNumbers(user, monthStart, now),
      this.allTimeNumbers(user, me.createdAt),
    ]);

    const workingToday = settings.schedule.workingDays.includes(parts.weekday);
    return {
      user: { id: me.id, name: me.name },
      timeZone,
      date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
      workday: {
        isWorkingDay: workingToday,
        startsAt: workingToday
          ? atLocalTime(
              now,
              0,
              Math.floor(settings.schedule.startMinute / 60),
              settings.schedule.startMinute % 60,
              timeZone,
            )
          : null,
        endsAt: workingToday
          ? atLocalTime(
              now,
              0,
              Math.floor(settings.schedule.endMinute / 60),
              settings.schedule.endMinute % 60,
              timeZone,
            )
          : null,
      },
      progress: {
        done: doneToday,
        planned,
        percent: planned === 0 ? 0 : Math.round((doneToday / planned) * 100),
      },
      streak,
      counters: {
        calls: counts.get(InteractionChannel.CALL) ?? 0,
        whatsapp: counts.get(InteractionChannel.WHATSAPP) ?? 0,
        meetings:
          (counts.get(InteractionChannel.MEETING) ?? 0) +
          (counts.get(InteractionChannel.VIDEO_CALL) ?? 0),
        visits: counts.get(InteractionChannel.SITE_VISIT) ?? 0,
        total,
        goal: settings.dailyInteractionGoal,
      },
      upNext,
      sections: {
        speedToLead: withoutUpNext(speedToLead),
        overdue: withoutUpNext(overdue),
        scheduled: withoutUpNext(scheduled),
        followUps: withoutUpNext(followUps),
      },
      suggested,
      upcoming: upcoming.slice(0, 8),
      month,
      allTime,
    };
  }

  /** Last outcome, unanswered streak and project of interest per lead. */
  private async loadContext(leadIds: string[]) {
    const map = new Map<string, NonNullable<TodayTask['context']>>();
    if (leadIds.length === 0) return map;
    const ids = [...new Set(leadIds)];
    const [leads, lastInteractions] = await Promise.all([
      this.prisma.lead.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          unansweredStreak: true,
          lastContactedAt: true,
          leadProjectInterests: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { project: { select: { name: true } } },
          },
        },
      }),
      this.prisma.interaction.findMany({
        where: { leadId: { in: ids } },
        orderBy: { occurredAt: 'desc' },
        distinct: ['leadId'],
        select: { leadId: true, outcome: true },
      }),
    ]);
    const outcomes = new Map(
      lastInteractions.map((i) => [i.leadId, i.outcome]),
    );
    for (const lead of leads) {
      map.set(lead.id, {
        unansweredStreak: lead.unansweredStreak,
        lastContactedAt: lead.lastContactedAt,
        lastOutcome: outcomes.get(lead.id) ?? null,
        projectName: lead.leadProjectInterests[0]?.project.name ?? null,
      });
    }
    return map;
  }

  /**
   * Consecutive past working days on which ≥ 80% of the tasks due that day
   * were done by its end. Days with nothing planned neither count nor break
   * the streak; today counts once it qualifies.
   */
  private async computeStreak(
    user: AuthenticatedUser,
    workingDays: readonly number[],
    timeZone: string,
    now: Date,
    today: { start: Date; end: Date },
  ): Promise<number> {
    const since = atLocalTime(now, -STREAK_LOOKBACK_DAYS, 0, 0, timeZone);
    const tasks = await this.prisma.task.findMany({
      where: {
        tenantId: user.tenantId,
        assigneeId: user.id,
        status: { not: TaskStatus.CANCELLED },
        dueAt: { gte: since, lt: today.end },
      },
      select: { dueAt: true, status: true, completedAt: true },
    });
    const byDay = new Map<string, { due: number; done: number; end: Date }>();
    for (const task of tasks) {
      const bounds = dayBoundsInZone(task.dueAt, timeZone);
      const key = bounds.start.toISOString();
      const entry = byDay.get(key) ?? { due: 0, done: 0, end: bounds.end };
      entry.due += 1;
      if (
        task.status === TaskStatus.DONE &&
        task.completedAt &&
        task.completedAt <= bounds.end
      ) {
        entry.done += 1;
      }
      byDay.set(key, entry);
    }

    let streak = 0;
    for (let offset = 0; offset <= STREAK_LOOKBACK_DAYS; offset += 1) {
      const day = dayBoundsInZone(
        atLocalTime(now, -offset, 12, 0, timeZone),
        timeZone,
      );
      const weekday = getZonedParts(day.start, timeZone).weekday;
      if (!workingDays.includes(weekday)) continue;
      const entry = byDay.get(day.start.toISOString());
      if (!entry || entry.due === 0) continue;
      const ok = entry.done / entry.due >= STREAK_THRESHOLD;
      if (offset === 0) {
        if (ok) streak += 1;
        continue;
      }
      if (!ok) break;
      streak += 1;
    }
    return streak;
  }

  /**
   * Revive suggestions to reach the daily goal (spec §3.4): the same stale
   * test as R8 — no contact for the stage's `staleAfterDays`; stages with
   * the rule off are not suggested — minus leads that already have an open
   * R8 "Revive" task (that task is on the plan already).
   */
  private async suggest(
    user: AuthenticatedUser,
    room: number,
    endOfToday: Date,
    now: Date,
  ): Promise<SuggestedLead[]> {
    if (room === 0) return [];
    const stages = await this.prisma.pipelineStage.findMany({
      where: {
        tenantId: user.tenantId,
        isClosed: false,
        staleAfterDays: { not: null },
      },
      select: { id: true, staleAfterDays: true },
    });
    if (stages.length === 0) return [];
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId: user.tenantId,
        assignedUserId: user.id,
        deletedAt: null,
        status: LeadStatus.OPEN,
        pipelineStage: { isClosed: false },
        nextTaskDueAt: { gte: endOfToday },
        tasks: {
          none: { status: TaskStatus.OPEN, ruleKey: RULE_KEYS.REVIVE_STALE },
        },
        OR: stages.map((stage) => {
          const staleBefore = new Date(
            now.getTime() - stage.staleAfterDays! * DAY_MS,
          );
          return {
            pipelineStageId: stage.id,
            OR: [
              { lastContactedAt: { lt: staleBefore } },
              { lastContactedAt: null, createdAt: { lt: staleBefore } },
            ],
          };
        }),
      },
      select: {
        id: true,
        fullName: true,
        heat: true,
        lastContactedAt: true,
        pipelineStage: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
      orderBy: [{ lastContactedAt: { sort: 'asc', nulls: 'first' } }],
      take: 30,
    });
    return leads
      .sort((a, b) => HEAT_RANK[a.heat] - HEAT_RANK[b.heat])
      .slice(0, Math.min(room, MAX_SUGGESTIONS))
      .map((lead) => ({
        id: lead.id,
        fullName: lead.fullName,
        heat: lead.heat,
        stage: lead.pipelineStage,
        lastContactedAt: lead.lastContactedAt,
        reason: lead.lastContactedAt
          ? `No contact for ${Math.floor((now.getTime() - lead.lastContactedAt.getTime()) / DAY_MS)} days`
          : 'Never contacted',
      }));
  }

  private async monthNumbers(
    user: AuthenticatedUser,
    monthStart: Date,
    now: Date,
  ) {
    const [interactions, visits, won, newLeads] = await Promise.all([
      this.prisma.interaction.count({
        where: {
          tenantId: user.tenantId,
          userId: user.id,
          occurredAt: { gte: monthStart, lte: now },
        },
      }),
      this.prisma.interaction.count({
        where: {
          tenantId: user.tenantId,
          userId: user.id,
          occurredAt: { gte: monthStart, lte: now },
          OR: [
            { channel: InteractionChannel.SITE_VISIT },
            { outcome: { in: VISIT_OUTCOMES } },
          ],
        },
      }),
      this.prisma.lead.count({
        where: {
          tenantId: user.tenantId,
          assignedUserId: user.id,
          deletedAt: null,
          closedAt: { gte: monthStart },
          pipelineStage: { closeType: 'WON' },
        },
      }),
      this.prisma.lead.count({
        where: {
          tenantId: user.tenantId,
          assignedUserId: user.id,
          deletedAt: null,
          assignedAt: { gte: monthStart },
        },
      }),
    ]);
    return { interactions, visits, won, newLeads };
  }

  private async allTimeNumbers(user: AuthenticatedUser, since: Date) {
    const [won, interactions, visits, clients, firstTouch] = await Promise.all([
      this.prisma.lead.count({
        where: {
          tenantId: user.tenantId,
          assignedUserId: user.id,
          deletedAt: null,
          pipelineStage: { closeType: 'WON' },
        },
      }),
      this.prisma.interaction.count({
        where: { tenantId: user.tenantId, userId: user.id },
      }),
      this.prisma.interaction.count({
        where: {
          tenantId: user.tenantId,
          userId: user.id,
          OR: [
            { channel: InteractionChannel.SITE_VISIT },
            { outcome: { in: VISIT_OUTCOMES } },
          ],
        },
      }),
      this.prisma.interaction.groupBy({
        by: ['leadId'],
        where: { tenantId: user.tenantId, userId: user.id },
      }),
      this.prisma.interaction.aggregate({
        where: { tenantId: user.tenantId, userId: user.id },
        _min: { occurredAt: true },
      }),
    ]);
    // History can be older than the account (imports, a re-created user).
    const first = firstTouch._min.occurredAt;
    return {
      won,
      interactions,
      visits,
      clients: clients.length,
      since: first && first < since ? first : since,
    };
  }
}

function heatRank(task: TodayTask): number {
  return task.lead ? HEAT_RANK[task.lead.heat] : 1;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
