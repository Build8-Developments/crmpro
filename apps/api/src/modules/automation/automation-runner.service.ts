import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AutomationExecutionStatus,
  AutomationTriggerType,
  Prisma,
} from '@prisma/client';
import { LoggingService } from '../../common/logging/logging.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationActionService } from './automation-action.service';
import { AutomationConditionService } from './automation-condition.service';
import { AutomationMetricsStore } from './metrics/automation-metrics.store';
import {
  AutomationEntityType,
  AutomationJobPayload,
  AutomationTestResult,
} from './entities/automation.types';
import { workflowSelect } from './mappers/automation.mapper';

@Injectable()
export class AutomationRunnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conditionService: AutomationConditionService,
    private readonly actionService: AutomationActionService,
    private readonly loggingService: LoggingService,
    private readonly metricsStore: AutomationMetricsStore,
  ) {}

  async run(payload: AutomationJobPayload): Promise<void> {
    const startedAt = Date.now();
    const workflow = await this.prisma.automationWorkflow.findFirst({
      where: {
        id: payload.workflowId,
        tenantId: payload.tenantId,
        deletedAt: null,
        enabled: true,
      },
      select: workflowSelect,
    });

    if (!workflow) {
      throw new NotFoundException('Automation workflow not found or disabled');
    }

    const entityData = await this.loadEntityData(
      payload.tenantId,
      payload.entityType,
      payload.entityId,
      payload.testContext,
    );

    const conditionsMet = this.conditionService.evaluateAll(
      workflow.conditions.map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
      })),
      entityData,
    );

    if (!conditionsMet) {
      if (!payload.isTest) {
        await this.persistExecution({
          workflowId: workflow.id,
          tenantId: payload.tenantId,
          triggerType: payload.triggerType,
          entityType: payload.entityType,
          entityId: payload.entityId,
          status: AutomationExecutionStatus.SKIPPED,
          startedAt: new Date(startedAt),
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt,
        });
      }

      this.metricsStore.recordSkipped();
      this.logRun(workflow.name, payload, 'skipped', Date.now() - startedAt);
      return;
    }

    if (payload.isTest) {
      return;
    }

    const execution = await this.persistExecution({
      workflowId: workflow.id,
      tenantId: payload.tenantId,
      triggerType: payload.triggerType,
      entityType: payload.entityType,
      entityId: payload.entityId,
      status: AutomationExecutionStatus.RUNNING,
      startedAt: new Date(startedAt),
    });

    const errors: string[] = [];
    let hadFailure = false;

    for (const action of workflow.actions) {
      const result = await this.actionService.executeAction(action.actionType, {
        tenantId: payload.tenantId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        entityType: payload.entityType,
        entityId: payload.entityId,
        configuration: action.configuration as Record<string, unknown>,
        entityData,
        isTest: false,
        actorUserId: workflow.createdByUserId,
      });

      if (!result.success && !result.skipped) {
        hadFailure = true;
        errors.push(result.message ?? `Action ${action.actionType} failed`);
      }
    }

    const durationMs = Date.now() - startedAt;
    const status = hadFailure
      ? AutomationExecutionStatus.PARTIAL
      : AutomationExecutionStatus.COMPLETED;

    await this.prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status,
        finishedAt: new Date(),
        durationMs,
        errorMessage: errors.length > 0 ? errors.join('; ') : null,
      },
    });

    if (hadFailure) {
      this.metricsStore.recordPartial(durationMs);
    } else {
      this.metricsStore.recordSuccess(durationMs);
    }

    this.logRun(
      workflow.name,
      payload,
      hadFailure ? 'partial' : 'completed',
      durationMs,
    );
  }

  async testWorkflow(
    tenantId: string,
    workflowId: string,
    entityType: AutomationEntityType,
    entityId: string,
    context?: Record<string, unknown>,
  ): Promise<AutomationTestResult> {
    const workflow = await this.prisma.automationWorkflow.findFirst({
      where: { id: workflowId, tenantId, deletedAt: null },
      select: workflowSelect,
    });

    if (!workflow) {
      throw new NotFoundException('Automation workflow not found');
    }

    const entityData = await this.loadEntityData(
      tenantId,
      entityType,
      entityId,
      context,
    );

    const conditionsMet = this.conditionService.evaluateAll(
      workflow.conditions.map((condition) => ({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
      })),
      entityData,
    );

    if (!conditionsMet) {
      return { conditionsMet: false, actions: [] };
    }

    const actions: AutomationTestResult['actions'] = [];

    for (const action of workflow.actions) {
      const result = await this.actionService.executeAction(action.actionType, {
        tenantId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        entityType,
        entityId,
        configuration: action.configuration as Record<string, unknown>,
        entityData,
        isTest: true,
        actorUserId: workflow.createdByUserId,
      });

      actions.push({
        actionType: action.actionType,
        executionOrder: action.executionOrder,
        status: result.skipped
          ? ('skipped' as const)
          : result.success
            ? ('simulated' as const)
            : ('failed' as const),
        message: result.message,
      });
    }

    return { conditionsMet: true, actions };
  }

  private async persistExecution(data: {
    workflowId: string;
    tenantId: string;
    triggerType: AutomationTriggerType;
    entityType: string;
    entityId: string;
    status: AutomationExecutionStatus;
    startedAt: Date;
    finishedAt?: Date;
    durationMs?: number;
    errorMessage?: string | null;
  }) {
    return this.prisma.automationExecution.create({
      data: {
        workflowId: data.workflowId,
        tenantId: data.tenantId,
        triggerType: data.triggerType,
        entityType: data.entityType,
        entityId: data.entityId,
        status: data.status,
        startedAt: data.startedAt,
        finishedAt: data.finishedAt ?? null,
        durationMs: data.durationMs ?? null,
        errorMessage: data.errorMessage ?? null,
      },
    });
  }

  private async loadEntityData(
    tenantId: string,
    entityType: AutomationEntityType,
    entityId: string,
    overrideContext?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (overrideContext) {
      return overrideContext;
    }

    switch (entityType) {
      case 'lead':
        return this.loadLeadContext(tenantId, entityId);
      case 'import_job':
        return this.loadImportJobContext(tenantId, entityId);
      case 'export_job':
        return this.loadExportJobContext(tenantId, entityId);
      case 'file':
        return this.loadFileContext(tenantId, entityId);
      case 'task':
        return this.loadTaskContext(tenantId, entityId);
      default:
        return {};
    }
  }

  private async loadTaskContext(
    tenantId: string,
    taskId: string,
  ): Promise<Record<string, unknown>> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, tenantId, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        type: true,
        dueAt: true,
        assignedUserId: true,
        leadId: true,
        projectId: true,
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found for automation context');
    }

    return task as Record<string, unknown>;
  }

  private async loadLeadContext(
    tenantId: string,
    leadId: string,
  ): Promise<Record<string, unknown>> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
        sourceId: true,
        pipelineId: true,
        pipelineStageId: true,
        assignedUserId: true,
        budgetMin: true,
        budgetMax: true,
        customFields: true,
        source: { select: { id: true, name: true } },
        pipelineStage: { select: { id: true, name: true } },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found for automation context');
    }

    return {
      ...lead,
      budgetMin: lead.budgetMin ? Number(lead.budgetMin) : null,
      budgetMax: lead.budgetMax ? Number(lead.budgetMax) : null,
      sourceName: lead.source?.name ?? null,
      stageName: lead.pipelineStage?.name ?? null,
    };
  }

  private async loadImportJobContext(
    tenantId: string,
    jobId: string,
  ): Promise<Record<string, unknown>> {
    const job = await this.prisma.importJob.findFirst({
      where: { id: jobId, tenantId },
      select: {
        id: true,
        status: true,
        successfulRows: true,
        failedRows: true,
        createdByUserId: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Import job not found for automation context');
    }

    return job as Record<string, unknown>;
  }

  private async loadExportJobContext(
    tenantId: string,
    jobId: string,
  ): Promise<Record<string, unknown>> {
    const job = await this.prisma.exportJob.findFirst({
      where: { id: jobId, tenantId },
      select: {
        id: true,
        status: true,
        rowCount: true,
        exportType: true,
        createdByUserId: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Export job not found for automation context');
    }

    return job as Record<string, unknown>;
  }

  private async loadFileContext(
    tenantId: string,
    fileId: string,
  ): Promise<Record<string, unknown>> {
    const file = await this.prisma.fileAsset.findFirst({
      where: { id: fileId, tenantId },
      select: {
        id: true,
        category: true,
        originalFilename: true,
        leadId: true,
        uploadedByUserId: true,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found for automation context');
    }

    return file as Record<string, unknown>;
  }

  private logRun(
    workflowName: string,
    payload: AutomationJobPayload,
    status: string,
    durationMs: number,
  ): void {
    this.loggingService.info({
      module: 'Automation',
      operation: 'run',
      status,
      durationMs,
      metadata: {
        workflow: workflowName,
        trigger: payload.triggerType,
        entityType: payload.entityType,
        entityId: payload.entityId,
        tenantId: payload.tenantId,
      },
    });
  }
}
