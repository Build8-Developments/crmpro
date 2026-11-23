import { Injectable } from '@nestjs/common';
import {
  DealStatus,
  LeadStatus,
  NotificationType,
  Prisma,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@crmpro/database';
import { dayBoundsInZone } from '@crmpro/shared/workflow';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../../notifications/utils/notification-dedupe.util';
import { TaskLifecycleService } from '../common/task-lifecycle.service';
import {
  TenantClockService,
  type WorkflowSettings,
} from '../common/tenant-clock.service';
import { LeadManagersService } from './lead-managers.service';
import {
  CHECK_IN_AFTER_DAYS,
  CONTRACT_EXPECTED_WITHIN_DAYS,
  PAPERWORK_DUE_WORKING_DAYS,
  RULE_CANDIDATE_BATCH,
  RULE_CATCH_UP_DAYS,
  RULE_KEYS,
} from './rule-keys';
import { RuleTaskWriter } from './rule-task-writer.service';
import {
  addWorkingDays,
  DAY_MS,
  daysAgo,
  daysBetween,
  endOfWorkday,
} from './rule-utils';

type Tx = Prisma.TransactionClient;

export const PAPERWORK_TITLE = 'Collect documents and set the contract date';
export const CHECK_IN_TITLE = 'Check-in call — ask for a referral';

/** Who works a deal's tasks: the credited agent, else the lead owner. */
const dealPeopleSelect = {
  agentId: true,
  agent: { select: { isActive: true, deletedAt: true } },
  lead: {
    select: {
      assignedUserId: true,
      assignedUser: { select: { isActive: true, deletedAt: true } },
    },
  },
} satisfies Prisma.DealSelect;

type DealPeople = Prisma.DealGetPayload<{ select: typeof dealPeopleSelect }>;

/**
 * R10: managers hear about it when this passes and the deal is still
 * reserved — the end of the expected contract day (tenant time), or 14 days
 * after the reservation when no date is set.
 */
export function contractDeadline(
  deal: { reservedAt: Date; expectedContractAt: Date | null },
  timeZone: string,
): Date {
  if (deal.expectedContractAt) {
    return dayBoundsInZone(deal.expectedContractAt, timeZone).end;
  }
  return new Date(
    deal.reservedAt.getTime() + CONTRACT_EXPECTED_WITHIN_DAYS * DAY_MS,
  );
}

/**
 * Deal rules (spec §3.2):
 * - R10 deal RESERVED → PAPERWORK "collect documents, set the contract date"
 *   for the deal's agent, due in 2 working days; contract date passed (or 14
 *   days without one) while still reserved → managers are told once.
 *   Contract closes the task, cancelling the deal cancels it.
 * - R11 deal CONTRACTED + 30 days → check-in call asking for a referral.
 * Tasks live on the Won lead, which is closed: they are created after the
 * Won move cancelled the lead's open tasks.
 */
@Injectable()
export class DealRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TenantClockService,
    private readonly lifecycle: TaskLifecycleService,
    private readonly writer: RuleTaskWriter,
    private readonly notifications: NotificationTriggerService,
    private readonly managers: LeadManagersService,
  ) {}

  // ─── Event-driven (inside the deal's transaction) ─────────────────────

  /**
   * R10, called by the deal recorder in the stage-move transaction, after
   * the Won move cancelled the lead's open tasks.
   */
  async onDealReserved(
    tx: Tx,
    deal: {
      tenantId: string;
      leadId: string;
      assigneeId: string;
      reservedAt: Date;
      expectedContractAt: Date | null;
    },
    now = new Date(),
  ): Promise<void> {
    const open = await tx.task.findFirst({
      where: {
        leadId: deal.leadId,
        ruleKey: RULE_KEYS.DEAL_PAPERWORK,
        status: TaskStatus.OPEN,
      },
      select: { id: true },
    });
    if (open) return;
    const settings = await this.clock.getWorkflowSettings(deal.tenantId);
    await this.writer.createInTx(
      tx,
      this.paperworkTask(deal, deal.assigneeId, settings, now),
    );
  }

  /** Contract signed: the paperwork is done and nothing is escalated. */
  async onDealContracted(tx: Tx, leadId: string, now = new Date()) {
    await this.lifecycle.closeRuleTasks(
      leadId,
      [RULE_KEYS.DEAL_PAPERWORK],
      TaskStatus.DONE,
      tx,
      now,
    );
    await tx.task.updateMany({
      where: {
        leadId,
        ruleKey: RULE_KEYS.DEAL_PAPERWORK,
        escalatedAt: null,
        escalateAt: { not: null },
      },
      data: { escalateAt: null },
    });
  }

  /** Deal cancelled: its paperwork and check-in no longer apply. */
  async onDealCancelled(tx: Tx, leadId: string, now = new Date()) {
    await this.lifecycle.closeRuleTasks(
      leadId,
      [RULE_KEYS.DEAL_PAPERWORK, RULE_KEYS.DEAL_CHECK_IN],
      TaskStatus.CANCELLED,
      tx,
      now,
    );
  }

  /**
   * A reserved deal was edited: a new contract date moves (and re-arms) the
   * escalation; a new agent takes over the open deal tasks.
   */
  async onDealEdited(
    tx: Tx,
    deal: {
      tenantId: string;
      leadId: string;
      status: DealStatus;
      reservedAt: Date;
      expectedContractAt: Date | null;
    },
    changes: { deadlineChanged: boolean; newAgentId?: string | null },
  ): Promise<void> {
    if (changes.deadlineChanged && deal.status === DealStatus.RESERVED) {
      const timeZone = await this.clock.getTimeZone(deal.tenantId);
      await tx.task.updateMany({
        where: {
          leadId: deal.leadId,
          ruleKey: RULE_KEYS.DEAL_PAPERWORK,
          status: { not: TaskStatus.CANCELLED },
        },
        data: {
          escalateAt: contractDeadline(deal, timeZone),
          escalatedAt: null,
        },
      });
    }
    if (changes.newAgentId) {
      await tx.task.updateMany({
        where: {
          leadId: deal.leadId,
          ruleKey: {
            in: [RULE_KEYS.DEAL_PAPERWORK, RULE_KEYS.DEAL_CHECK_IN],
          },
          status: TaskStatus.OPEN,
        },
        data: { assigneeId: changes.newAgentId },
      });
    }
  }

  // ─── Sweep ─────────────────────────────────────────────────────────────

  /**
   * R10 fallback: a deal reserved in the last 14 days without a paperwork
   * task since its reservation (e.g. created before this rule, or the task
   * was cancelled by a move between Won stages) gets one.
   */
  async ensurePaperwork(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<number> {
    const deals = await this.prisma.deal.findMany({
      where: {
        tenantId,
        status: DealStatus.RESERVED,
        reservedAt: { gte: daysAgo(now, RULE_CATCH_UP_DAYS) },
        lead: { deletedAt: null, status: LeadStatus.OPEN },
      },
      select: {
        id: true,
        leadId: true,
        reservedAt: true,
        expectedContractAt: true,
        ...dealPeopleSelect,
      },
      orderBy: { reservedAt: 'asc' },
      take: RULE_CANDIDATE_BATCH,
    });
    if (deals.length === 0) return 0;

    const since = await this.ruleTaskTimes(
      tenantId,
      RULE_KEYS.DEAL_PAPERWORK,
      deals.map((deal) => deal.leadId),
      // A system-cancelled task does not count: the deal still needs one.
      { status: { not: TaskStatus.CANCELLED } },
    );
    let created = 0;
    for (const deal of deals) {
      const times = since.get(deal.leadId) ?? [];
      if (times.some((createdAt) => createdAt >= deal.reservedAt)) continue;
      const assigneeId = await this.assigneeFor(tenantId, deal);
      if (!assigneeId) continue;
      const ok = await this.writer.create(
        this.paperworkTask(
          { ...deal, tenantId, leadId: deal.leadId },
          assigneeId,
          settings,
          now,
        ),
      );
      if (ok) created += 1;
    }
    return created;
  }

  /**
   * R10 escalation: the deal is still reserved when its contract date (or
   * reservation + 14 days) passes → the agent's managers are told, once.
   */
  async escalateOverdueContracts(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<number> {
    const due = await this.prisma.task.findMany({
      where: {
        tenantId,
        ruleKey: RULE_KEYS.DEAL_PAPERWORK,
        status: { not: TaskStatus.CANCELLED },
        escalatedAt: null,
        escalateAt: { lte: now },
      },
      select: {
        id: true,
        assigneeId: true,
        assignee: { select: { name: true } },
        lead: {
          select: {
            id: true,
            fullName: true,
            deals: {
              where: { status: DealStatus.RESERVED },
              select: { id: true, reservedAt: true, expectedContractAt: true },
              take: 1,
            },
          },
        },
      },
      take: 200,
    });

    const date = new Intl.DateTimeFormat('en-GB', {
      timeZone: settings.schedule.timeZone,
      day: 'numeric',
      month: 'short',
    });
    let count = 0;
    for (const task of due) {
      const deal = task.lead?.deals[0];
      if (!task.lead || !deal) {
        // Contracted or cancelled meanwhile: nothing to escalate any more.
        await this.prisma.task.updateMany({
          where: { id: task.id, escalatedAt: null },
          data: { escalateAt: null },
        });
        continue;
      }
      const claimed = await this.prisma.task.updateMany({
        where: { id: task.id, escalatedAt: null },
        data: { escalatedAt: now },
      });
      if (claimed.count === 0) continue;
      count += 1;

      const deadline = contractDeadline(deal, settings.schedule.timeZone);
      const message = deal.expectedContractAt
        ? `${task.lead.fullName}'s deal is still reserved — the contract was expected on ${date.format(deal.expectedContractAt)}. Check with ${task.assignee.name}.`
        : `${task.lead.fullName}'s deal was reserved ${daysBetween(deal.reservedAt, now)} days ago and has no contract date yet. Check with ${task.assignee.name}.`;
      const recipients = await this.managers.forAssignee(
        tenantId,
        task.assigneeId,
      );
      for (const recipientUserId of recipients) {
        await this.notifications.trigger({
          tenantId,
          recipientUserId,
          type: NotificationType.ESCALATION,
          metadata: {
            kind: 'contract_overdue',
            title: 'Contract date passed',
            message,
            leadId: task.lead.id,
            leadName: task.lead.fullName,
            dealId: deal.id,
            assigneeId: task.assigneeId,
            taskId: task.id,
            expectedContractAt: deadline.toISOString(),
          },
          // Once per deal and deadline, even if the task is recreated.
          dedupeKey: buildNotificationDedupeKey({
            entityType: 'deal',
            entityId: deal.id,
            type: NotificationType.ESCALATION,
            recipientUserId,
            suffix: `contract_overdue:${deadline.toISOString()}`,
          }),
        });
      }
    }
    return count;
  }

  /**
   * R11: deals contracted 30–44 days ago get one check-in call asking for a
   * referral (the 14-day window keeps older contracts from flooding in).
   */
  async ensureCheckIns(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<number> {
    const deals = await this.prisma.deal.findMany({
      where: {
        tenantId,
        status: DealStatus.CONTRACTED,
        contractedAt: {
          gte: daysAgo(now, CHECK_IN_AFTER_DAYS + RULE_CATCH_UP_DAYS),
          lte: daysAgo(now, CHECK_IN_AFTER_DAYS),
        },
        lead: { deletedAt: null, status: LeadStatus.OPEN },
      },
      select: {
        id: true,
        leadId: true,
        contractedAt: true,
        ...dealPeopleSelect,
      },
      orderBy: { contractedAt: 'asc' },
      take: RULE_CANDIDATE_BATCH,
    });
    if (deals.length === 0) return 0;

    const since = await this.ruleTaskTimes(
      tenantId,
      RULE_KEYS.DEAL_CHECK_IN,
      deals.map((deal) => deal.leadId),
    );
    const dueAt = endOfWorkday(now, settings.schedule);
    let created = 0;
    for (const deal of deals) {
      if (!deal.contractedAt) continue;
      const times = since.get(deal.leadId) ?? [];
      if (times.some((createdAt) => createdAt >= deal.contractedAt!)) continue;
      const assigneeId = await this.assigneeFor(tenantId, deal);
      if (!assigneeId) continue;
      const ok = await this.writer.create({
        tenantId,
        leadId: deal.leadId,
        assigneeId,
        type: TaskType.CALL,
        title: CHECK_IN_TITLE,
        dueAt,
        priority: TaskPriority.NORMAL,
        ruleKey: RULE_KEYS.DEAL_CHECK_IN,
      });
      if (ok) created += 1;
    }
    return created;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────

  private paperworkTask(
    deal: {
      tenantId: string;
      leadId: string;
      reservedAt: Date;
      expectedContractAt: Date | null;
    },
    assigneeId: string,
    settings: WorkflowSettings,
    now: Date,
  ) {
    return {
      tenantId: deal.tenantId,
      leadId: deal.leadId,
      assigneeId,
      type: TaskType.PAPERWORK,
      title: PAPERWORK_TITLE,
      dueAt: addWorkingDays(now, PAPERWORK_DUE_WORKING_DAYS, settings.schedule),
      escalateAt: contractDeadline(deal, settings.schedule.timeZone),
      priority: TaskPriority.HIGH,
      ruleKey: RULE_KEYS.DEAL_PAPERWORK,
    };
  }

  /** The active agent, else the active lead owner, else a distributor. */
  private async assigneeFor(
    tenantId: string,
    deal: DealPeople,
  ): Promise<string | null> {
    if (deal.agentId && deal.agent?.isActive && !deal.agent.deletedAt) {
      return deal.agentId;
    }
    const owner = deal.lead.assignedUser;
    if (deal.lead.assignedUserId && owner?.isActive && !owner.deletedAt) {
      return deal.lead.assignedUserId;
    }
    return (await this.managers.distributors(tenantId))[0] ?? null;
  }

  /** Creation times of each lead's tasks from `ruleKey`. */
  private async ruleTaskTimes(
    tenantId: string,
    ruleKey: string,
    leadIds: string[],
    extra: Prisma.TaskWhereInput = {},
  ): Promise<Map<string, Date[]>> {
    const tasks = await this.prisma.task.findMany({
      where: { tenantId, ruleKey, leadId: { in: leadIds }, ...extra },
      select: { leadId: true, createdAt: true },
    });
    const map = new Map<string, Date[]>();
    for (const task of tasks) {
      if (!task.leadId) continue;
      map.set(task.leadId, [...(map.get(task.leadId) ?? []), task.createdAt]);
    }
    return map;
  }
}
