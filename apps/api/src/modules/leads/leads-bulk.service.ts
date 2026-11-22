import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { LeadStatus } from '@crmpro/database';
import { AuditWriterService } from '../audit/audit-writer.service';
import { AUDIT_ENTITY_TYPES } from '../audit/audit.constants';
import {
  BULK_LEAD_ACTION_TYPES,
  BULK_LEAD_AUDIT_ACTIONS,
  MAX_BULK_MATCHING,
} from './constants/leads-bulk.constants';
import { BulkAssignLeadsDto } from './dto/bulk-assign-leads.dto';
import { BulkMoveStageDto } from './dto/bulk-move-stage.dto';
import { BulkTransferLeadsDto } from './dto/bulk-transfer-leads.dto';
import { LeadSelectionFiltersDto } from './dto/get-leads-query.dto';
import { LeadSelectionDto } from './dto/lead-selection.dto';
import { LeadsService } from './leads.service';
import {
  allocateLeads,
  LeadWorkloadService,
} from './services/lead-workload.service';
import type { TransferPreview } from './types/leads-bulk.types';
import type { LeadListFilters } from './types/lead.types';
import { LeadAssignmentService } from './services/lead-assignment.service';
import { LeadStageService } from './services/lead-stage.service';
import type { BulkLeadActionResult } from './types/leads-bulk.types';
import { type LeadScope } from '../../common/auth';

@Injectable()
export class LeadsBulkService {
  constructor(
    private readonly leadAssignmentService: LeadAssignmentService,
    private readonly leadStageService: LeadStageService,
    private readonly auditWriter: AuditWriterService,
    private readonly leadsService: LeadsService,
    private readonly workload: LeadWorkloadService,
  ) {}

  async bulkAssignLeads(
    tenantId: string,
    actorUserId: string,
    dto: BulkAssignLeadsDto,
    scope: LeadScope,
  ): Promise<BulkLeadActionResult> {
    const leadIds = await this.resolveLeadIds(tenantId, dto, scope);
    const result = await this.processLeads(leadIds, async (leadId) => {
      await this.leadAssignmentService.assignLead(
        leadId,
        tenantId,
        actorUserId,
        {
          userId: dto.userId,
        },
        scope,
      );
    });

    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId,
      action: BULK_LEAD_AUDIT_ACTIONS.ASSIGNED,
      entityType: AUDIT_ENTITY_TYPES.LEAD_BULK_ACTION,
      metadata: {
        actionType: BULK_LEAD_ACTION_TYPES.ASSIGN,
        targetUserId: dto.userId,
        selection: dto.filters ? 'FILTERS' : 'IDS',
        leadCount: leadIds.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    });

    return result;
  }

  async bulkMoveStage(
    tenantId: string,
    actorUserId: string,
    dto: BulkMoveStageDto,
    scope: LeadScope,
  ): Promise<BulkLeadActionResult> {
    // Winning records a deal per lead, so it is never a bulk action.
    await this.leadStageService.assertBulkTargetAllowed(
      tenantId,
      dto.targetStageId,
    );
    const leadIds = await this.resolveLeadIds(tenantId, dto, scope);
    const result = await this.processLeads(leadIds, async (leadId) => {
      await this.leadStageService.moveStage(
        leadId,
        tenantId,
        actorUserId,
        {
          pipelineStageId: dto.targetStageId,
          lostReasonId: dto.lostReasonId,
          lostNote: dto.lostNote,
        },
        scope,
      );
    });

    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId,
      action: BULK_LEAD_AUDIT_ACTIONS.STAGE_CHANGED,
      entityType: AUDIT_ENTITY_TYPES.LEAD_BULK_ACTION,
      metadata: {
        actionType: BULK_LEAD_ACTION_TYPES.MOVE_STAGE,
        targetStageId: dto.targetStageId,
        leadCount: leadIds.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    });

    return result;
  }

  /** What a transfer would move, and to whom — nothing changes. */
  async previewTransfer(
    tenantId: string,
    dto: BulkTransferLeadsDto,
    scope: LeadScope,
  ): Promise<TransferPreview> {
    const plan = await this.planTransfer(tenantId, dto, scope);
    return plan.preview;
  }

  /**
   * Move a user's open leads to one or more teammates. Each lead's open tasks
   * follow it (LeadAssignmentService → TaskLifecycleService).
   */
  async bulkTransferLeads(
    tenantId: string,
    actorUserId: string,
    dto: BulkTransferLeadsDto,
    scope: LeadScope,
  ): Promise<
    BulkLeadActionResult & { allocations: TransferPreview['allocations'] }
  > {
    const plan = await this.planTransfer(tenantId, dto, scope);
    const ownerByLead = new Map<string, string>();
    for (const [userId, leadIds] of plan.allocation) {
      for (const leadId of leadIds) ownerByLead.set(leadId, userId);
    }
    const result = await this.processLeads(
      [...ownerByLead.keys()],
      async (leadId) => {
        await this.leadAssignmentService.assignLead(
          leadId,
          tenantId,
          actorUserId,
          {
            userId: ownerByLead.get(leadId)!,
          },
          scope,
        );
      },
    );

    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId,
      action: BULK_LEAD_AUDIT_ACTIONS.TRANSFERRED,
      entityType: AUDIT_ENTITY_TYPES.LEAD_BULK_ACTION,
      metadata: {
        actionType: BULK_LEAD_ACTION_TYPES.TRANSFER,
        fromUserId: dto.fromUserId,
        toUserIds: dto.toUserIds,
        distribution: dto.distribution ?? 'EVEN',
        leadCount: ownerByLead.size,
        allocations: plan.preview.allocations.map((a) => ({
          userId: a.userId,
          count: a.leadCount,
        })),
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    });

    return { ...result, allocations: plan.preview.allocations };
  }

  private async planTransfer(
    tenantId: string,
    dto: BulkTransferLeadsDto,
    scope: LeadScope,
  ) {
    const recipientIds = [...new Set(dto.toUserIds)];
    if (recipientIds.includes(dto.fromUserId)) {
      throw new BadRequestException('Choose two different people');
    }
    const leadIds = await this.leadsService.findMatchingLeadIds(
      tenantId,
      {
        ...this.toListFilters(dto.filters),
        assignees: [dto.fromUserId],
        assignedUserId: undefined,
        unassignedOnly: undefined,
        status: LeadStatus.OPEN,
        openOnly: true,
      },
      MAX_BULK_MATCHING,
      scope,
    );
    // Recipients come from the scoped workload: a team leader can only hand
    // leads to people in their team.
    const [candidates, workload] = await Promise.all([
      this.leadsService.getTransferCandidates(tenantId, leadIds),
      this.workload.getWorkload(tenantId, scope),
    ]);
    const loadById = new Map(workload.map((w) => [w.userId, w]));
    const recipients = recipientIds.map((userId) => {
      const user = loadById.get(userId);
      if (!user)
        throw new BadRequestException('Recipient not found or inactive');
      return { userId, openLeads: user.openLeads };
    });
    const allocation = allocateLeads(
      candidates,
      recipients,
      dto.distribution ?? 'EVEN',
    );

    const byStage = new Map<
      string,
      {
        stageId: string;
        name: string;
        color: string | null;
        icon: string | null;
        count: number;
      }
    >();
    let hot = 0;
    let overdue = 0;
    let openTasks = 0;
    const now = Date.now();
    for (const lead of candidates) {
      if (lead.heat === 'HOT') hot += 1;
      if (lead.nextTaskDueAt && lead.nextTaskDueAt.getTime() < now)
        overdue += 1;
      openTasks += lead.openTaskCount;
      const entry = byStage.get(lead.stage.id) ?? {
        stageId: lead.stage.id,
        name: lead.stage.name,
        color: lead.stage.color,
        icon: lead.stage.icon,
        count: 0,
      };
      entry.count += 1;
      byStage.set(lead.stage.id, entry);
    }

    const preview: TransferPreview = {
      leadCount: candidates.length,
      hotLeads: hot,
      overdueLeads: overdue,
      openTasks,
      byStage: [...byStage.values()].sort((a, b) => b.count - a.count),
      allocations: recipients.map((r) => ({
        userId: r.userId,
        name: loadById.get(r.userId)!.name,
        currentOpenLeads: r.openLeads,
        leadCount: allocation.get(r.userId)!.length,
      })),
    };
    return { preview, allocation };
  }

  private async resolveLeadIds(
    tenantId: string,
    selection: LeadSelectionDto,
    scope: LeadScope,
  ): Promise<string[]> {
    if (selection.leadIds && selection.filters) {
      throw new BadRequestException('Send either leadIds or filters, not both');
    }
    if (selection.filters) {
      return this.leadsService.findMatchingLeadIds(
        tenantId,
        this.toListFilters(selection.filters),
        MAX_BULK_MATCHING,
        scope,
      );
    }
    return this.deduplicateLeadIds(selection.leadIds ?? []);
  }

  private toListFilters(filters?: LeadSelectionFiltersDto): LeadListFilters {
    if (!filters) return {};
    const { search, ...rest } = filters;
    return { ...rest, search };
  }

  private deduplicateLeadIds(leadIds: string[]): string[] {
    return [...new Set(leadIds)];
  }

  private async processLeads(
    leadIds: string[],
    action: (leadId: string) => Promise<void>,
  ): Promise<BulkLeadActionResult> {
    const failures: BulkLeadActionResult['failures'] = [];
    let successCount = 0;

    for (const leadId of leadIds) {
      try {
        await action(leadId);
        successCount += 1;
      } catch (error) {
        failures.push({
          leadId,
          reason: this.extractFailureReason(error),
        });
      }
    }

    return {
      successCount,
      failureCount: failures.length,
      failures,
    };
  }

  private extractFailureReason(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response !== null) {
        const message = (response as { message?: string | string[] }).message;

        if (Array.isArray(message)) {
          return message.join(', ');
        }

        if (typeof message === 'string') {
          return message;
        }
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Operation failed';
  }
}
