import { Injectable, Logger } from '@nestjs/common';
import { AutomationTriggerType } from '@prisma/client';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationQueueService } from './automation-queue.service';
import {
  AutomationEntityType,
  AutomationTriggerInput,
  CachedAutomationWorkflow,
} from './entities/automation.types';
import { workflowSelect } from './mappers/automation.mapper';

@Injectable()
export class AutomationTriggerService {
  private readonly logger = new Logger(AutomationTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly queueService: AutomationQueueService,
  ) {}

  async trigger(input: AutomationTriggerInput): Promise<void> {
    const workflows = await this.getActiveWorkflows(
      input.tenantId,
      input.triggerType,
    );

    if (workflows.length === 0) {
      return;
    }

    for (const workflow of workflows) {
      void this.queueService.enqueue({
        workflowId: workflow.id,
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        triggerType: input.triggerType,
      });
    }

    this.logger.debug(
      `Triggered ${workflows.length} workflow(s) for ${input.triggerType} entity=${input.entityType}:${input.entityId}`,
    );
  }

  async onLeadCreated(params: {
    tenantId: string;
    leadId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      triggerType: AutomationTriggerType.LEAD_CREATED,
      entityType: 'lead',
      entityId: params.leadId,
    });
  }

  async onLeadUpdated(params: {
    tenantId: string;
    leadId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      triggerType: AutomationTriggerType.LEAD_UPDATED,
      entityType: 'lead',
      entityId: params.leadId,
    });
  }

  async onLeadAssigned(params: {
    tenantId: string;
    leadId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      triggerType: AutomationTriggerType.LEAD_ASSIGNED,
      entityType: 'lead',
      entityId: params.leadId,
    });
  }

  async onLeadStageChanged(params: {
    tenantId: string;
    leadId: string;
    closeType?: string | null;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      triggerType: AutomationTriggerType.LEAD_STAGE_CHANGED,
      entityType: 'lead',
      entityId: params.leadId,
    });

    if (params.closeType === 'WON') {
      await this.trigger({
        tenantId: params.tenantId,
        triggerType: AutomationTriggerType.LEAD_WON,
        entityType: 'lead',
        entityId: params.leadId,
      });
    }

    if (params.closeType === 'LOST') {
      await this.trigger({
        tenantId: params.tenantId,
        triggerType: AutomationTriggerType.LEAD_LOST,
        entityType: 'lead',
        entityId: params.leadId,
      });
    }
  }

  async onImportCompleted(params: {
    tenantId: string;
    importJobId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      triggerType: AutomationTriggerType.IMPORT_COMPLETED,
      entityType: 'import_job',
      entityId: params.importJobId,
    });
  }

  async onExportCompleted(params: {
    tenantId: string;
    exportJobId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      triggerType: AutomationTriggerType.EXPORT_COMPLETED,
      entityType: 'export_job',
      entityId: params.exportJobId,
    });
  }

  async onFileUploaded(params: {
    tenantId: string;
    fileId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      triggerType: AutomationTriggerType.FILE_UPLOADED,
      entityType: 'file',
      entityId: params.fileId,
    });
  }

  async onTaskOverdue(params: {
    tenantId: string;
    taskId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      triggerType: AutomationTriggerType.TASK_OVERDUE,
      entityType: 'task',
      entityId: params.taskId,
    });
  }

  private async getActiveWorkflows(
    tenantId: string,
    trigger: AutomationTriggerType,
  ): Promise<CachedAutomationWorkflow[]> {
    const cacheKey = this.cacheService.buildAutomationWorkflowKey(
      tenantId,
      trigger,
    );
    const cached =
      await this.cacheService.get<CachedAutomationWorkflow[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const workflows = await this.prisma.automationWorkflow.findMany({
      where: {
        tenantId,
        trigger,
        enabled: true,
        deletedAt: null,
      },
      select: workflowSelect,
      orderBy: { createdAt: 'asc' },
    });

    const mapped: CachedAutomationWorkflow[] = workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      tenantId: workflow.tenantId,
      trigger: workflow.trigger,
      conditions: workflow.conditions.map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
      })),
      actions: workflow.actions.map((action) => ({
        actionType: action.actionType,
        configuration: action.configuration as Record<string, unknown>,
        executionOrder: action.executionOrder,
      })),
    }));

    await this.cacheService.set(
      cacheKey,
      mapped,
      this.cacheService.getAutomationCacheTtlSeconds(),
    );

    return mapped;
  }
}
