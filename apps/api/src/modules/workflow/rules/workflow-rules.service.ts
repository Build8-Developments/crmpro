import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  LeadActivityEventType,
  NotificationType,
  TaskOrigin,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@crmpro/database';
import {
  addWorkingMinutes,
  atLocalTime,
  getZonedParts,
  workingMinutesBetween,
} from '@crmpro/shared/workflow';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import {
  DOMAIN_EVENT_TYPES,
  type DomainEvent,
  TasksChangedEvent,
} from '../../../common/events/domain-event.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeadActivityService } from '../../leads/services/lead-activity.service';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../../notifications/utils/notification-dedupe.util';
import { SchedulerService } from '../../scheduler/scheduler.service';
import { TaskLifecycleService } from '../common/task-lifecycle.service';
import {
  TenantClockService,
  type WorkflowSettings,
} from '../common/tenant-clock.service';
import { DealRulesService } from './deal-rules.service';
import { LeadManagersService } from './lead-managers.service';
import { LeadTimeRulesService } from './lead-time-rules.service';
import {
  CONFIRM_APPOINTMENT_HOUR,
  PLAN_NEXT_STEP_BATCH,
  PLAN_NEXT_STEP_WITHIN_MINUTES,
  RULES_SWEEP_EVERY_MS,
  RULES_SWEEP_JOB,
  RULE_KEYS,
} from './rule-keys';
import {
  ACTIVE_TENANT_STATUSES,
  isUniqueViolation,
  OPEN_LEAD,
} from './rule-utils';

export interface SweepResult {
  /** R1 first calls that missed the SLA. */
  breached: number;
  /** R1 misses escalated to managers. */
  escalated: number;
  /** R7 "plan the next step" tasks. */
  plannedNextSteps: number;
  /** R13 rolling "assign new leads" tasks touched. */
  managerTasks: number;
  /** R8 "revive" calls. */
  revived: number;
  /** R9 manager reviews of stuck leads. */
  stuckReviews: number;
  /** R10 paperwork tasks created by the fallback. */
  paperwork: number;
  /** R10 overdue contracts escalated to managers. */
  contractsEscalated: number;
  /** R11 check-in calls. */
  checkIns: number;
  /** R12 re-engage calls. */
  reEngaged: number;
  /** R9/R12 tasks closed because the lead moved on. */
  autoClosed: number;
}

/**
 * The playbook (spec §3). Event-driven rules run when a lead is created or
 * assigned; time-based rules and the "every open lead has a next step"
 * invariant run in a sweep every 5 minutes. Every rule is idempotent.
 */
@Injectable()
export class WorkflowRulesService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowRulesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: TenantClockService,
    private readonly lifecycle: TaskLifecycleService,
    private readonly leadActivity: LeadActivityService,
    private readonly notifications: NotificationTriggerService,
    private readonly managers: LeadManagersService,
    private readonly scheduler: SchedulerService,
    private readonly events: DomainEventBus,
    private readonly leadTimeRules: LeadTimeRulesService,
    private readonly dealRules: DealRulesService,
  ) {}

  onModuleInit(): void {
    for (const type of [
      DOMAIN_EVENT_TYPES.LEAD_CREATED,
      DOMAIN_EVENT_TYPES.LEAD_ASSIGNED,
    ]) {
      this.events.subscribe(
        type,
        (event: DomainEvent & { leadId?: string }) => {
          if (!event.leadId) return;
          void this.onLeadOwnerChanged(event.tenantId, event.leadId).catch(
            (error: unknown) =>
              this.logger.error(
                `Rules for lead ${event.leadId} failed: ${String(error)}`,
              ),
          );
        },
      );
    }

    this.scheduler.register({
      name: RULES_SWEEP_JOB,
      everyMs: RULES_SWEEP_EVERY_MS,
      run: async () => {
        await this.sweepAllTenants();
      },
    });
  }

  // ─── Event-driven ──────────────────────────────────────────────────────

  /** Lead created or (re/un)assigned: R1 for the owner, R13 for the pool. */
  async onLeadOwnerChanged(
    tenantId: string,
    leadId: string,
    now = new Date(),
  ): Promise<void> {
    const settings = await this.clock.getWorkflowSettings(tenantId);
    await this.ensureFirstContact(tenantId, leadId, settings, now);
    await this.refreshAssignTask(tenantId, settings, now);
    void this.events.publish(new TasksChangedEvent(tenantId));
  }

  /**
   * R1: a never-contacted lead with an owner gets a URGENT first call due
   * within the SLA (working minutes from assignment). Reassignment restarts
   * the clock for the new owner.
   */
  async ensureFirstContact(
    tenantId: string,
    leadId: string,
    settings: WorkflowSettings,
    now = new Date(),
  ): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, ...OPEN_LEAD },
      select: {
        id: true,
        fullName: true,
        assignedUserId: true,
        assignedAt: true,
        firstContactedAt: true,
        source: { select: { name: true } },
      },
    });
    if (!lead?.assignedUserId || lead.firstContactedAt) return;

    const start = lead.assignedAt ?? now;
    const dueAt = addWorkingMinutes(
      start,
      settings.firstContactSlaMinutes,
      settings.schedule,
    );
    const escalateAt = addWorkingMinutes(
      start,
      settings.escalateAfterMinutes,
      settings.schedule,
    );
    const title = lead.source
      ? `First call — new lead from ${lead.source.name}`
      : 'First call — new lead';

    const existing = await this.prisma.task.findFirst({
      where: {
        leadId,
        ruleKey: RULE_KEYS.FIRST_CONTACT,
        status: TaskStatus.OPEN,
      },
      select: { id: true, assigneeId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      if (existing) {
        if (existing.assigneeId === lead.assignedUserId) return;
        await tx.task.update({
          where: { id: existing.id },
          data: {
            assigneeId: lead.assignedUserId!,
            dueAt,
            escalateAt,
            escalatedAt: null,
            reminderSentAt: null,
            overdueNotifiedAt: null,
          },
        });
      } else {
        try {
          const task = await tx.task.create({
            data: {
              tenantId,
              leadId,
              assigneeId: lead.assignedUserId!,
              type: TaskType.CALL,
              title,
              dueAt,
              escalateAt,
              priority: TaskPriority.URGENT,
              origin: TaskOrigin.SYSTEM,
              ruleKey: RULE_KEYS.FIRST_CONTACT,
            },
            select: { id: true },
          });
          await this.leadActivity.createActivity(
            {
              tenantId,
              leadId,
              actorUserId: null,
              eventType: LeadActivityEventType.TASK_CREATED,
              metadata: {
                taskId: task.id,
                title,
                ruleKey: RULE_KEYS.FIRST_CONTACT,
                dueAt: dueAt.toISOString(),
              },
            },
            tx,
          );
        } catch (error) {
          // Created concurrently by another event — the rule already holds.
          if (isUniqueViolation(error)) return;
          throw error;
        }
      }
      await this.lifecycle.refreshNextTaskDueAt(leadId, tx);
    });
  }

  /**
   * R5: a meeting or visit booked for a later day gets a "confirm" WhatsApp
   * the day before at 11:00 (tenant time).
   */
  async afterNextStepScheduled(
    tenantId: string,
    leadId: string,
    assigneeId: string,
    nextStep: { type: TaskType; dueAt: Date },
    now = new Date(),
  ): Promise<void> {
    if (
      nextStep.type !== TaskType.MEETING &&
      nextStep.type !== TaskType.SITE_VISIT
    ) {
      return;
    }
    const timeZone = await this.clock.getTimeZone(tenantId);
    const confirmAt = atLocalTime(
      nextStep.dueAt,
      -1,
      CONFIRM_APPOINTMENT_HOUR,
      0,
      timeZone,
    );
    if (confirmAt <= now) return;

    const what = nextStep.type === TaskType.SITE_VISIT ? 'visit' : 'meeting';
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(nextStep.dueAt);

    try {
      await this.prisma.$transaction(async (tx) => {
        // A rebooked appointment replaces the previous confirmation.
        await tx.task.updateMany({
          where: {
            leadId,
            ruleKey: RULE_KEYS.CONFIRM_APPOINTMENT,
            status: TaskStatus.OPEN,
          },
          data: { status: TaskStatus.CANCELLED, completedAt: now },
        });
        await tx.task.create({
          data: {
            tenantId,
            leadId,
            assigneeId,
            type: TaskType.WHATSAPP,
            title: `Confirm tomorrow's ${what} (${time})`,
            dueAt: confirmAt,
            priority: TaskPriority.HIGH,
            origin: TaskOrigin.SYSTEM,
            ruleKey: RULE_KEYS.CONFIRM_APPOINTMENT,
          },
        });
        await this.lifecycle.refreshNextTaskDueAt(leadId, tx);
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }

  // ─── Sweep ─────────────────────────────────────────────────────────────

  async sweepAllTenants(now = new Date()): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null, status: { in: ACTIVE_TENANT_STATUSES } },
      select: { id: true },
    });
    for (const tenant of tenants) {
      try {
        const result = await this.sweepTenant(tenant.id, now);
        const changed = (Object.values(result) as number[]).reduce(
          (sum, n) => sum + n,
          0,
        );
        if (changed > 0) {
          this.logger.log(
            `Rules sweep tenant=${tenant.id} ${JSON.stringify(result)}`,
          );
          void this.events.publish(new TasksChangedEvent(tenant.id));
        }
      } catch (error) {
        this.logger.error(
          `Rules sweep failed for tenant ${tenant.id}: ${String(error)}`,
        );
      }
    }
  }

  async sweepTenant(tenantId: string, now = new Date()): Promise<SweepResult> {
    const settings = await this.clock.getWorkflowSettings(tenantId);
    await this.closeSatisfiedFirstContacts(tenantId, now);
    const breached = await this.markSlaBreaches(tenantId, now);
    const escalated = await this.escalateMissedFirstContacts(tenantId, now);

    // Close what resolved itself first, so R7 sees reopened leads.
    const autoClosed =
      (await this.safely(tenantId, 'R9 close', () =>
        this.leadTimeRules.closeLeftStageReviews(tenantId, now),
      )) +
      (await this.safely(tenantId, 'R12 close', () =>
        this.leadTimeRules.closeReopenedReEngagements(tenantId, now),
      ));

    const plannedNextSteps = await this.ensureNextSteps(
      tenantId,
      settings,
      now,
    );

    const paperwork = await this.safely(tenantId, 'R10', () =>
      this.dealRules.ensurePaperwork(tenantId, settings, now),
    );
    const contractsEscalated = await this.safely(tenantId, 'R10 escalate', () =>
      this.dealRules.escalateOverdueContracts(tenantId, settings, now),
    );
    const checkIns = await this.safely(tenantId, 'R11', () =>
      this.dealRules.ensureCheckIns(tenantId, settings, now),
    );
    const stuckReviews = await this.safely(tenantId, 'R9', () =>
      this.leadTimeRules.ensureStuckReviews(tenantId, settings, now),
    );
    // After R7: a lead that just got a next step is not "stale".
    const revived = await this.safely(tenantId, 'R8', () =>
      this.leadTimeRules.ensureRevives(tenantId, settings, now),
    );
    const reEngaged = await this.safely(tenantId, 'R12', () =>
      this.leadTimeRules.ensureReEngagements(tenantId, settings, now),
    );

    const managerTasks = await this.refreshAssignTask(tenantId, settings, now);
    await this.alertLongUnassigned(tenantId, settings, now);
    return {
      breached,
      escalated,
      plannedNextSteps,
      managerTasks,
      revived,
      stuckReviews,
      paperwork,
      contractsEscalated,
      checkIns,
      reEngaged,
      autoClosed,
    };
  }

  /** One failing rule must not stop the others for the tenant. */
  private async safely(
    tenantId: string,
    rule: string,
    run: () => Promise<number>,
  ): Promise<number> {
    try {
      return await run();
    } catch (error) {
      this.logger.error(
        `Rule ${rule} failed for tenant ${tenantId}: ${String(error)}`,
      );
      return 0;
    }
  }

  /** Someone already reached the lead (maybe not the owner): R1 is done. */
  private async closeSatisfiedFirstContacts(tenantId: string, now: Date) {
    await this.prisma.task.updateMany({
      where: {
        tenantId,
        ruleKey: RULE_KEYS.FIRST_CONTACT,
        status: TaskStatus.OPEN,
        lead: { firstContactedAt: { not: null } },
      },
      data: { status: TaskStatus.DONE, completedAt: now },
    });
  }

  /** The first call was not made inside the SLA: stamp the lead once. */
  private async markSlaBreaches(tenantId: string, now: Date): Promise<number> {
    const missed = await this.prisma.task.findMany({
      where: {
        tenantId,
        ruleKey: RULE_KEYS.FIRST_CONTACT,
        status: TaskStatus.OPEN,
        dueAt: { lte: now },
        lead: { slaBreachedAt: null, firstContactedAt: null },
      },
      select: {
        leadId: true,
        dueAt: true,
        assigneeId: true,
        assignee: { select: { name: true } },
      },
      take: 500,
    });

    let count = 0;
    for (const task of missed) {
      if (!task.leadId) continue;
      const leadId = task.leadId;
      const claimed = await this.prisma.$transaction(async (tx) => {
        const result = await tx.lead.updateMany({
          where: { id: leadId, slaBreachedAt: null },
          data: { slaBreachedAt: task.dueAt },
        });
        if (result.count === 0) return false;
        await this.leadActivity.createActivity(
          {
            tenantId,
            leadId,
            actorUserId: null,
            eventType: LeadActivityEventType.SLA_BREACHED,
            metadata: {
              assigneeId: task.assigneeId,
              assigneeName: task.assignee.name,
              dueAt: task.dueAt.toISOString(),
            },
          },
          tx,
        );
        return true;
      });
      if (claimed) count += 1;
    }
    return count;
  }

  /** Still not contacted at the escalation time: tell the managers, once. */
  private async escalateMissedFirstContacts(
    tenantId: string,
    now: Date,
  ): Promise<number> {
    const due = await this.prisma.task.findMany({
      where: {
        tenantId,
        ruleKey: RULE_KEYS.FIRST_CONTACT,
        status: TaskStatus.OPEN,
        escalatedAt: null,
        escalateAt: { lte: now },
      },
      select: {
        id: true,
        assigneeId: true,
        escalateAt: true,
        assignee: { select: { name: true } },
        lead: { select: { id: true, fullName: true, assignedAt: true } },
      },
      take: 200,
    });

    let count = 0;
    for (const task of due) {
      const claimed = await this.prisma.task.updateMany({
        where: { id: task.id, escalatedAt: null },
        data: { escalatedAt: now },
      });
      if (claimed.count === 0 || !task.lead) continue;
      count += 1;

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
            kind: 'first_contact_missed',
            title: 'New lead not called yet',
            message: `${task.lead.fullName} is still waiting for a first call from ${task.assignee.name}. Nudge them or reassign the lead.`,
            leadId: task.lead.id,
            leadName: task.lead.fullName,
            assigneeId: task.assigneeId,
            taskId: task.id,
          },
          dedupeKey: buildNotificationDedupeKey({
            entityType: 'task',
            entityId: task.id,
            type: NotificationType.ESCALATION,
            recipientUserId,
          }),
        });
      }
    }
    return count;
  }

  /**
   * R7 invariant: every open, assigned lead has a next step. Leads without
   * one get a HIGH "follow up" call at the next working moment.
   */
  async ensureNextSteps(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<number> {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        ...OPEN_LEAD,
        assignedUserId: { not: null },
        nextTaskDueAt: null,
        // A manager's review is not the agent's next step.
        tasks: {
          none: { status: TaskStatus.OPEN, type: { not: TaskType.REVIEW } },
        },
      },
      select: { id: true, assignedUserId: true },
      orderBy: { createdAt: 'asc' },
      take: PLAN_NEXT_STEP_BATCH,
    });
    if (leads.length === 0) return 0;

    // An hour of working time to decide and do it — not "overdue" on arrival.
    const dueAt = addWorkingMinutes(
      now,
      PLAN_NEXT_STEP_WITHIN_MINUTES,
      settings.schedule,
    );
    const title = 'Follow up — no next step was planned';
    const created = await this.prisma.$transaction(async (tx) => {
      const result = await tx.task.createMany({
        data: leads.map((lead) => ({
          tenantId,
          leadId: lead.id,
          assigneeId: lead.assignedUserId!,
          type: TaskType.CALL,
          title,
          dueAt,
          priority: TaskPriority.HIGH,
          origin: TaskOrigin.SYSTEM,
          ruleKey: RULE_KEYS.PLAN_NEXT_STEP,
        })),
        // The partial unique index makes a concurrent duplicate a no-op.
        skipDuplicates: true,
      });
      await tx.lead.updateMany({
        where: {
          id: { in: leads.map((lead) => lead.id) },
          nextTaskDueAt: null,
        },
        data: { nextTaskDueAt: dueAt },
      });
      await tx.leadActivity.createMany({
        data: leads.map((lead) => ({
          tenantId,
          leadId: lead.id,
          actorUserId: null,
          eventType: LeadActivityEventType.TASK_CREATED,
          metadata: {
            title,
            ruleKey: RULE_KEYS.PLAN_NEXT_STEP,
            dueAt: dueAt.toISOString(),
          },
        })),
      });
      return result.count;
    });
    return created;
  }

  /**
   * R13: while leads wait for an owner, every distributor has one rolling
   * "Assign N new leads" task. It closes itself when the pool is empty.
   */
  async refreshAssignTask(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<number> {
    const [waiting, oldest, distributors] = await Promise.all([
      this.prisma.lead.count({
        where: { tenantId, ...OPEN_LEAD, assignedUserId: null },
      }),
      this.prisma.lead.findFirst({
        where: { tenantId, ...OPEN_LEAD, assignedUserId: null },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
      this.managers.distributors(tenantId),
    ]);

    const open = await this.prisma.task.findMany({
      where: {
        tenantId,
        leadId: null,
        ruleKey: RULE_KEYS.ASSIGN_NEW_LEADS,
        status: TaskStatus.OPEN,
      },
      select: { id: true, assigneeId: true, title: true, priority: true },
    });

    if (waiting === 0) {
      if (open.length === 0) return 0;
      await this.prisma.task.updateMany({
        where: { id: { in: open.map((task) => task.id) } },
        data: { status: TaskStatus.DONE, completedAt: now },
      });
      return open.length;
    }

    const title = `Assign ${waiting} new ${waiting === 1 ? 'lead' : 'leads'}`;
    const waitedMinutes = oldest
      ? workingMinutesBetween(oldest.createdAt, now, settings.schedule)
      : 0;
    const priority =
      waitedMinutes >= settings.escalateAfterMinutes
        ? TaskPriority.URGENT
        : TaskPriority.HIGH;

    let changed = 0;
    for (const userId of distributors) {
      const mine = open.find((task) => task.assigneeId === userId);
      if (mine) {
        if (mine.title === title && mine.priority === priority) continue;
        await this.prisma.task.update({
          where: { id: mine.id },
          data: { title, priority },
        });
      } else {
        await this.prisma.task.create({
          data: {
            tenantId,
            assigneeId: userId,
            type: TaskType.REVIEW,
            title,
            // Due when the oldest waiting lead hits the escalation time.
            dueAt: addWorkingMinutes(
              oldest?.createdAt ?? now,
              settings.escalateAfterMinutes,
              settings.schedule,
            ),
            priority,
            origin: TaskOrigin.SYSTEM,
            ruleKey: RULE_KEYS.ASSIGN_NEW_LEADS,
          },
        });
      }
      changed += 1;
    }
    return changed;
  }

  /** R13 escalation: leads unassigned past the escalation time (≤ 1 alert/hour). */
  private async alertLongUnassigned(
    tenantId: string,
    settings: WorkflowSettings,
    now: Date,
  ): Promise<void> {
    const candidates = await this.prisma.lead.findMany({
      where: { tenantId, ...OPEN_LEAD, assignedUserId: null },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
      take: 500,
    });
    const late = candidates.filter(
      (lead) =>
        workingMinutesBetween(lead.createdAt, now, settings.schedule) >=
        settings.escalateAfterMinutes,
    ).length;
    if (late === 0) return;

    const p = getZonedParts(now, settings.schedule.timeZone);
    const hourBucket = `${p.year}-${p.month}-${p.day}-${p.hour}`;
    for (const recipientUserId of await this.managers.distributors(tenantId)) {
      await this.notifications.trigger({
        tenantId,
        recipientUserId,
        type: NotificationType.ESCALATION,
        metadata: {
          kind: 'leads_unassigned',
          title: 'Leads waiting for an owner',
          message: `${late} ${late === 1 ? 'lead has' : 'leads have'} waited more than ${settings.escalateAfterMinutes} working minutes without an owner.`,
          count: late,
        },
        dedupeKey: buildNotificationDedupeKey({
          entityType: 'tenant',
          entityId: tenantId,
          type: NotificationType.ESCALATION,
          recipientUserId,
          suffix: `unassigned:${hourBucket}`,
        }),
      });
    }
  }
}
