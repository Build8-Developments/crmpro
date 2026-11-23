import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadActivityEventType,
  LeadStatus,
  PipelineCloseType,
  Prisma,
} from '@crmpro/database';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MoveStageDto } from '../dto/move-stage.dto';
import { leadSelect, toLeadResponse } from '../lead.mapper';
import { LeadActivityResponse, LeadWorkflowResult } from '../types/lead.types';
import { LeadActivityService } from './lead-activity.service';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import {
  LeadMovedStageEvent,
  TasksChangedEvent,
} from '../../../common/events/domain-event.types';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { TaskLifecycleService } from '../../workflow/common/task-lifecycle.service';
import { LostReasonsService } from '../../workflow/lost-reasons/lost-reasons.service';
import { DealRecorderService } from '../../deals/services/deal-recorder.service';
import { type LeadScope, leadScopeWhere } from '../../../common/auth';

const workflowLeadSelect = {
  id: true,
  tenantId: true,
  status: true,
  pipelineId: true,
  pipelineStageId: true,
  assignedUserId: true,
  pipelineStage: {
    select: {
      id: true,
      name: true,
      closeType: true,
    },
  },
} satisfies Prisma.LeadSelect;

type WorkflowLeadRecord = Prisma.LeadGetPayload<{
  select: typeof workflowLeadSelect;
}>;

const stageTargetSelect = {
  id: true,
  name: true,
  isClosed: true,
  closeType: true,
} satisfies Prisma.PipelineStageSelect;

type StageTarget = Prisma.PipelineStageGetPayload<{
  select: typeof stageTargetSelect;
}>;

export interface StageMoveParams {
  tenantId: string;
  actorUserId: string;
  leadId: string;
  fromStage: { id: string; name: string };
  targetStage: StageTarget;
  now: Date;
  lostReason?: { id: string; name: string } | null;
  lostNote?: string | null;
  /** Extra timeline metadata (e.g. why the lead re-opened). */
  extraMetadata?: Record<string, Prisma.InputJsonValue | null>;
}

export interface StageMoveOutcome {
  activity: LeadActivityResponse;
  cancelledTaskCount: number;
  fromStage: { id: string; name: string };
  targetStage: StageTarget;
}

@Injectable()
export class LeadStageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityService: LeadActivityService,
    private readonly domainEventBus: DomainEventBus,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly taskLifecycle: TaskLifecycleService,
    private readonly lostReasons: LostReasonsService,
    private readonly dealRecorder: DealRecorderService,
  ) {}

  async moveStage(
    leadId: string,
    tenantId: string,
    actorUserId: string,
    dto: MoveStageDto,
    scope: LeadScope,
  ): Promise<LeadWorkflowResult> {
    const lead = await this.getWorkflowLeadOrThrow(leadId, tenantId, scope);
    this.ensureLeadIsOpen(lead.status, 'move stages');

    if (lead.pipelineStageId === dto.pipelineStageId) {
      throw new BadRequestException('Lead is already in this stage');
    }

    const targetStage = await this.prisma.pipelineStage.findFirst({
      where: {
        id: dto.pipelineStageId,
        tenantId,
        pipelineId: lead.pipelineId,
      },
      select: stageTargetSelect,
    });

    if (!targetStage) {
      throw new BadRequestException(
        'Pipeline stage not found or does not belong to lead pipeline',
      );
    }

    const isLost = targetStage.closeType === PipelineCloseType.LOST;
    const isWon = targetStage.closeType === PipelineCloseType.WON;

    // A live deal pins the lead to Won: it has to be cancelled first (which
    // re-opens the lead). Won → another Won stage keeps the same deal.
    const liveDeal = await this.dealRecorder.findLiveDeal(tenantId, lead.id);
    if (liveDeal && !isWon) {
      throw new ConflictException({
        code: API_ERROR_CODES.DEAL_ACTIVE,
        message: 'This lead has an active deal. Cancel the deal first.',
      });
    }

    // Lost needs a reason: it is what the "where do we lose" report reads.
    let lostReason: { id: string; name: string } | null = null;
    if (isLost) {
      if (!dto.lostReasonId) {
        throw new BadRequestException({
          code: API_ERROR_CODES.LOST_REASON_REQUIRED,
          message: 'Choose why this lead was lost.',
        });
      }
      lostReason = await this.lostReasons.assertUsable(
        tenantId,
        dto.lostReasonId,
      );
    }

    const now = new Date();
    // Won needs the deal: it is what the money reports read.
    const preparedDeal =
      isWon && !liveDeal
        ? await this.dealRecorder.prepare(
            tenantId,
            actorUserId,
            lead,
            dto.deal,
            now,
          )
        : null;

    const outcome = await this.prisma.$transaction(async (tx) => {
      const moved = await this.applyStageMove(tx, {
        tenantId,
        actorUserId,
        leadId: lead.id,
        fromStage: lead.pipelineStage,
        targetStage,
        now,
        lostReason,
        lostNote: isLost ? (dto.lostNote ?? null) : null,
      });
      // Same transaction: a lead is never Won without its deal.
      if (preparedDeal) await this.dealRecorder.create(tx, preparedDeal);
      return moved;
    });

    return this.afterStageMove(tenantId, lead.id, actorUserId, outcome);
  }

  /**
   * Bulk moves cannot win leads: each won lead needs its own deal details.
   * Checked once before any lead is touched.
   */
  async assertBulkTargetAllowed(
    tenantId: string,
    targetStageId: string,
  ): Promise<void> {
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: targetStageId, tenantId },
      select: { closeType: true },
    });
    if (stage?.closeType === PipelineCloseType.WON) {
      throw new BadRequestException({
        code: API_ERROR_CODES.DEAL_REQUIRED,
        message: 'Win leads one at a time so each deal is recorded.',
      });
    }
  }

  /**
   * After a deal is cancelled: move the won lead back to the open stage it
   * was won from (latest STAGE_CHANGED into its won stage), else the last
   * open stage of its pipeline. Runs in the caller's transaction; the caller
   * must call `afterStageMove` once it commits. Returns null when the lead is
   * not in a Won stage (nothing to re-open).
   */
  async reopenWonLeadInTx(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      actorUserId: string;
      leadId: string;
      dealId: string;
      now: Date;
    },
  ): Promise<StageMoveOutcome | null> {
    const lead = await tx.lead.findFirst({
      where: { id: params.leadId, tenantId: params.tenantId, deletedAt: null },
      select: workflowLeadSelect,
    });
    if (!lead || lead.pipelineStage.closeType !== PipelineCloseType.WON) {
      return null;
    }

    const targetStage = await this.findReopenStage(tx, lead);
    if (!targetStage) {
      throw new BadRequestException(
        'This pipeline has no open stage to move the lead back to',
      );
    }

    return this.applyStageMove(tx, {
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      leadId: lead.id,
      fromStage: lead.pipelineStage,
      targetStage,
      now: params.now,
      extraMetadata: { reason: 'DEAL_CANCELLED', dealId: params.dealId },
    });
  }

  /**
   * The stage-move write shared by single moves and deal-cancel reopens:
   * lead fields, task cancellation on close, STAGE_CHANGED activity.
   */
  async applyStageMove(
    tx: Prisma.TransactionClient,
    params: StageMoveParams,
  ): Promise<StageMoveOutcome> {
    const { targetStage, fromStage, now } = params;
    const isClosedTransition = targetStage.isClosed;
    const lostReason = params.lostReason ?? null;
    const lostNote = params.lostNote ?? null;

    await tx.lead.update({
      where: { id: params.leadId },
      data: {
        pipelineStageId: targetStage.id,
        stageEnteredAt: now,
        // Closing stamps closedAt; reopening clears it and the lost reason.
        closedAt: isClosedTransition ? now : null,
        lostReasonId: lostReason?.id ?? null,
        lostNote,
      },
    });

    // A closed lead has no next step.
    const cancelledTaskCount = isClosedTransition
      ? await this.taskLifecycle.cancelOpenTasks(params.leadId, tx)
      : 0;

    const activity = await this.leadActivityService.createActivity(
      {
        tenantId: params.tenantId,
        leadId: params.leadId,
        actorUserId: params.actorUserId,
        eventType: LeadActivityEventType.STAGE_CHANGED,
        metadata: {
          fromStageId: fromStage.id,
          fromStageName: fromStage.name,
          toStageId: targetStage.id,
          toStageName: targetStage.name,
          isClosedTransition,
          closeType: targetStage.closeType,
          lostReasonId: lostReason?.id ?? null,
          lostReasonName: lostReason?.name ?? null,
          lostNote,
          cancelledTaskCount,
          ...params.extraMetadata,
        },
      },
      tx,
    );

    return { activity, cancelledTaskCount, fromStage, targetStage };
  }

  /** Post-commit side effects of a stage move: events, notification, payload. */
  async afterStageMove(
    tenantId: string,
    leadId: string,
    actorUserId: string,
    outcome: StageMoveOutcome,
  ): Promise<LeadWorkflowResult> {
    const updatedLead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      select: leadSelect,
    });

    if (!updatedLead) {
      throw new NotFoundException('Lead not found');
    }

    void this.domainEventBus.publish(new LeadMovedStageEvent(tenantId, leadId));
    if (outcome.cancelledTaskCount > 0) {
      void this.domainEventBus.publish(new TasksChangedEvent(tenantId));
    }

    if (updatedLead.assignedUser) {
      void this.notificationTrigger.notifyLeadStageChanged({
        tenantId,
        recipientUserId: updatedLead.assignedUser.id,
        leadId: updatedLead.id,
        leadName: updatedLead.fullName,
        fromStageName: outcome.fromStage.name,
        toStageName: outcome.targetStage.name,
        closeType: outcome.targetStage.closeType,
        actorUserId,
      });
    }

    return {
      lead: toLeadResponse(updatedLead),
      activity: outcome.activity,
    };
  }

  private async findReopenStage(
    tx: Prisma.TransactionClient,
    lead: WorkflowLeadRecord,
  ): Promise<StageTarget | null> {
    const wonMove = await tx.leadActivity.findFirst({
      where: {
        tenantId: lead.tenantId,
        leadId: lead.id,
        eventType: LeadActivityEventType.STAGE_CHANGED,
        metadata: { path: ['toStageId'], equals: lead.pipelineStageId },
      },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true },
    });
    const fromStageId = this.readFromStageId(wonMove?.metadata);
    if (fromStageId) {
      const previous = await tx.pipelineStage.findFirst({
        where: {
          id: fromStageId,
          tenantId: lead.tenantId,
          pipelineId: lead.pipelineId,
          isClosed: false,
        },
        select: stageTargetSelect,
      });
      if (previous) return previous;
    }

    // Unknown history (seeded/imported, or that stage is gone): the last
    // open stage, i.e. the one closest to winning.
    return tx.pipelineStage.findFirst({
      where: {
        tenantId: lead.tenantId,
        pipelineId: lead.pipelineId,
        isClosed: false,
      },
      orderBy: { sortOrder: 'desc' },
      select: stageTargetSelect,
    });
  }

  private readFromStageId(metadata: Prisma.JsonValue | undefined) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }
    const value = metadata.fromStageId;
    return typeof value === 'string' ? value : null;
  }

  private async getWorkflowLeadOrThrow(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<WorkflowLeadRecord> {
    // Out of scope behaves exactly like missing.
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScopeWhere(scope) },
      select: workflowLeadSelect,
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  private ensureLeadIsOpen(status: LeadStatus, action: string): void {
    if (status === LeadStatus.ARCHIVED) {
      throw new BadRequestException(`Archived leads cannot ${action}`);
    }
  }
}
