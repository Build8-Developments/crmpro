import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FileAssetCategory,
  InteractionDirection,
  InterestLevel,
  LeadActivityEventType,
  LeadStatus,
  TaskOrigin,
  TaskPriority,
  TaskStatus,
} from '@crmpro/database';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import {
  CHANNEL_LABELS,
  computeLeadHeat,
  isUnansweredOutcome,
  NEXT_STEP_DEFAULTS,
  OUTCOME_LABELS,
  OUTCOMES_BY_CHANNEL,
  requiresNextStep,
  TASK_TYPE_LABELS,
} from '@crmpro/shared/workflow';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import {
  LeadUpdatedEvent,
  TasksChangedEvent,
} from '../../../common/events/domain-event.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { leadSelect, toLeadResponse } from '../../leads/lead.mapper';
import { LeadActivityService } from '../../leads/services/lead-activity.service';
import type { LeadResponse } from '../../leads/types/lead.types';
import { FilesService } from '../../files/files.service';
import { TaskLifecycleService } from '../common/task-lifecycle.service';
import {
  interactionSelect,
  InteractionResponse,
  taskSelect,
  TaskResponse,
  toTaskResponse,
} from '../common/workflow.mappers';
import { LogInteractionDto } from './dto/log-interaction.dto';
import {
  type LeadScope,
  SYSTEM_LEAD_SCOPE,
  leadScopeWhere,
} from '../../../common/auth';
import { WorkflowRulesService } from '../rules/workflow-rules.service';

const MAX_BACKDATE_MS = 48 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
/** Open tasks due within this window are considered satisfied by a touch. */
const AUTO_COMPLETE_WINDOW_MS = 12 * 60 * 60 * 1000;

export interface LogInteractionResult {
  interaction: InteractionResponse;
  lead: LeadResponse;
  nextTask: TaskResponse | null;
  completedTaskIds: string[];
}

@Injectable()
export class InteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: TaskLifecycleService,
    private readonly leadActivity: LeadActivityService,
    private readonly domainEvents: DomainEventBus,
    private readonly files: FilesService,
    private readonly rules: WorkflowRulesService,
  ) {}

  async list(
    tenantId: string,
    leadId: string,
    scope: LeadScope,
  ): Promise<InteractionResponse[]> {
    await this.getLeadOrThrow(tenantId, leadId, scope);
    return this.prisma.interaction.findMany({
      where: { tenantId, leadId },
      orderBy: { occurredAt: 'desc' },
      take: 200,
      select: interactionSelect,
    });
  }

  /**
   * Log a touch. In one transaction: store the interaction, update the
   * lead's contact facts and heat, close the task(s) it satisfies, schedule
   * the next step, and write the timeline entry.
   */
  async log(
    user: AuthenticatedUser,
    leadId: string,
    dto: LogInteractionDto,
    scope: LeadScope,
  ): Promise<LogInteractionResult> {
    const now = new Date();
    const lead = await this.getLeadOrThrow(user.tenantId, leadId, scope);
    if (lead.status === LeadStatus.ARCHIVED) {
      throw new BadRequestException('Archived leads cannot be updated');
    }
    if (!OUTCOMES_BY_CHANNEL[dto.channel].includes(dto.outcome)) {
      throw new BadRequestException(
        `"${OUTCOME_LABELS[dto.outcome]}" is not an outcome of a ${CHANNEL_LABELS[dto.channel]}`,
      );
    }

    const occurredAt = dto.occurredAt ?? now;
    if (occurredAt.getTime() > now.getTime() + CLOCK_SKEW_MS) {
      throw new BadRequestException('An interaction cannot be in the future');
    }
    if (now.getTime() - occurredAt.getTime() > MAX_BACKDATE_MS) {
      throw new BadRequestException(
        'Interactions can be back-dated up to 48 hours',
      );
    }

    const leadIsOpen = !lead.pipelineStage.isClosed;
    if (leadIsOpen && requiresNextStep(dto.outcome) && !dto.nextStep) {
      throw new BadRequestException({
        code: API_ERROR_CODES.NEXT_STEP_REQUIRED,
        message: 'Schedule the next step for this lead.',
      });
    }
    if (dto.nextStep && !leadIsOpen) {
      throw new BadRequestException('Closed leads have no next steps');
    }
    if (
      dto.nextStep &&
      dto.nextStep.dueAt.getTime() < now.getTime() - CLOCK_SKEW_MS
    ) {
      throw new BadRequestException('The next step must be in the future');
    }
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId: user.tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!project) throw new BadRequestException('Project not found');
    }

    // Evidence becomes lead attachments first (verified against storage, quota
    // and the upload intent). If logging fails afterwards the files simply
    // stay on the lead — they are still the lead's documents.
    const evidence = await this.completeEvidence(user, leadId, dto);

    const direction = dto.direction ?? InteractionDirection.OUTBOUND;
    const unanswered = isUnansweredOutcome(dto.outcome);
    const unansweredStreak = unanswered ? lead.unansweredStreak + 1 : 0;
    const heat = computeLeadHeat({
      lastOutcome: dto.outcome,
      lastOutcomeAt: occurredAt,
      hasHotInterest: lead.leadProjectInterests.length > 0,
      unansweredStreak,
      now,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const interaction = await tx.interaction.create({
        data: {
          tenantId: user.tenantId,
          leadId,
          userId: user.id,
          channel: dto.channel,
          direction,
          outcome: dto.outcome,
          durationSeconds: dto.durationSeconds ?? null,
          note: dto.note || null,
          projectId: dto.projectId ?? null,
          occurredAt,
        },
        select: { id: true },
      });
      if (evidence.length > 0) {
        await tx.fileAsset.updateMany({
          where: {
            id: { in: evidence.map((file) => file.id) },
            tenantId: user.tenantId,
            leadId,
          },
          data: { interactionId: interaction.id },
        });
      }

      // Close the task(s) this touch satisfies.
      const toComplete = dto.taskId
        ? await tx.task.findMany({
            where: {
              id: dto.taskId,
              leadId,
              tenantId: user.tenantId,
              status: TaskStatus.OPEN,
            },
            select: { id: true },
          })
        : await tx.task.findMany({
            where: {
              leadId,
              assigneeId: user.id,
              status: TaskStatus.OPEN,
              dueAt: { lte: new Date(now.getTime() + AUTO_COMPLETE_WINDOW_MS) },
            },
            select: { id: true },
          });
      if (dto.taskId && toComplete.length === 0) {
        throw new BadRequestException('Task not found or already closed');
      }
      const completedTaskIds = toComplete.map((t) => t.id);
      if (completedTaskIds.length > 0) {
        await tx.task.updateMany({
          where: { id: { in: completedTaskIds } },
          data: {
            status: TaskStatus.DONE,
            completedAt: now,
            completedInteractionId: interaction.id,
          },
        });
      }

      let nextTask: TaskResponse | null = null;
      if (dto.nextStep) {
        const assigneeId = lead.assignedUserId ?? user.id;
        const fallbackTitle =
          NEXT_STEP_DEFAULTS[dto.outcome]?.title ??
          TASK_TYPE_LABELS[dto.nextStep.type];
        const created = await tx.task.create({
          data: {
            tenantId: user.tenantId,
            leadId,
            assigneeId,
            createdByUserId: user.id,
            type: dto.nextStep.type,
            title: dto.nextStep.title || fallbackTitle,
            dueAt: dto.nextStep.dueAt,
            isAllDay: dto.nextStep.isAllDay ?? false,
            priority:
              dto.nextStep.priority ??
              (heat === 'HOT' ? TaskPriority.HIGH : TaskPriority.NORMAL),
            origin:
              assigneeId === user.id ? TaskOrigin.SELF : TaskOrigin.MANAGER,
          },
          select: taskSelect,
        });
        nextTask = toTaskResponse(created, now);
      }

      const lastContactedAt =
        lead.lastContactedAt && lead.lastContactedAt > occurredAt
          ? lead.lastContactedAt
          : occurredAt;
      await tx.lead.update({
        where: { id: leadId },
        data: {
          lastContactedAt,
          heat,
          unansweredStreak,
          ...(direction === InteractionDirection.OUTBOUND
            ? { contactAttempts: { increment: 1 } }
            : {}),
          ...(lead.firstContactedAt === null ||
          lead.firstContactedAt.getTime() > occurredAt.getTime()
            ? { firstContactedAt: occurredAt }
            : {}),
        },
      });
      await this.lifecycle.refreshNextTaskDueAt(leadId, tx);

      await this.leadActivity.createActivity(
        {
          tenantId: user.tenantId,
          leadId,
          actorUserId: user.id,
          eventType: LeadActivityEventType.INTERACTION_LOGGED,
          metadata: {
            interactionId: interaction.id,
            channel: dto.channel,
            direction,
            outcome: dto.outcome,
            durationSeconds: dto.durationSeconds ?? null,
            note: dto.note ? dto.note.slice(0, 280) : null,
            evidence: evidence.map((file) => ({
              id: file.id,
              name: file.originalFilename,
            })),
            completedTaskIds,
            nextTask: nextTask
              ? {
                  id: nextTask.id,
                  type: nextTask.type,
                  title: nextTask.title,
                  dueAt: nextTask.dueAt.toISOString(),
                }
              : null,
          },
        },
        tx,
      );

      return { interactionId: interaction.id, nextTask, completedTaskIds };
    });

    const interaction = await this.prisma.interaction.findUniqueOrThrow({
      where: { id: result.interactionId },
      select: interactionSelect,
    });
    const updated = await this.prisma.lead.findFirstOrThrow({
      where: { id: leadId, tenantId: user.tenantId },
      select: leadSelect,
    });
    void this.domainEvents.publish(new LeadUpdatedEvent(user.tenantId, leadId));
    void this.domainEvents.publish(new TasksChangedEvent(user.tenantId));

    // R5: a booked meeting/visit gets a confirmation the day before.
    if (result.nextTask) {
      await this.rules.afterNextStepScheduled(
        user.tenantId,
        leadId,
        result.nextTask.assignee.id,
        { type: result.nextTask.type, dueAt: result.nextTask.dueAt },
        now,
      );
    }

    return {
      interaction,
      nextTask: result.nextTask,
      completedTaskIds: result.completedTaskIds,
      lead: toLeadResponse(updated),
    };
  }

  private async completeEvidence(
    user: AuthenticatedUser,
    leadId: string,
    dto: LogInteractionDto,
  ): Promise<Array<{ id: string; originalFilename: string }>> {
    const keys = [
      ...new Set((dto.evidence ?? []).map((item) => item.objectKey)),
    ];
    const completed: Array<{ id: string; originalFilename: string }> = [];
    for (const objectKey of keys) {
      const file = await this.files.completeUpload(
        user.tenantId,
        user.id,
        {
          objectKey,
          category: FileAssetCategory.LEAD_ATTACHMENT,
          leadId,
        },
        SYSTEM_LEAD_SCOPE,
      ); // the lead was checked against the actor's scope
      completed.push({ id: file.id, originalFilename: file.originalFilename });
    }
    return completed;
  }

  private async getLeadOrThrow(
    tenantId: string,
    leadId: string,
    scope: LeadScope,
  ) {
    // Out of scope behaves exactly like missing.
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(scope),
      },
      select: {
        id: true,
        status: true,
        assignedUserId: true,
        firstContactedAt: true,
        lastContactedAt: true,
        unansweredStreak: true,
        pipelineStage: { select: { isClosed: true } },
        leadProjectInterests: {
          where: { interestLevel: InterestLevel.HOT },
          select: { projectId: true },
          take: 1,
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
