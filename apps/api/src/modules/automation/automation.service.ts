import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AutomationActionType,
  AutomationTriggerType,
  Prisma,
} from '@prisma/client';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import { buildOrderBy, normalizeSearch, SortOrder } from '../../common/query';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationRunnerService } from './automation-runner.service';
import { AutomationTemplateService } from './automation-template.service';
import { AUTOMATION_SORT_FIELDS } from './automation.constants';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { GetAutomationsQueryDto } from './dto/get-automations-query.dto';
import { GetExecutionsQueryDto } from './dto/get-executions-query.dto';
import { TestAutomationDto } from './dto/test-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import {
  AutomationEntityType,
  AutomationExecutionResponse,
  AutomationTestResult,
  AutomationWorkflowResponse,
} from './entities/automation.types';
import {
  executionSelect,
  toExecutionResponse,
  toWorkflowResponse,
  workflowSelect,
} from './mappers/automation.mapper';

const AUTOMATION_SORT_CONFIG = {
  allowedFields: AUTOMATION_SORT_FIELDS,
  defaultField: 'createdAt' as const,
  defaultOrder: SortOrder.DESC,
};

const EXECUTION_SORT_CONFIG = {
  allowedFields: ['createdAt', 'status', 'durationMs'] as const,
  defaultField: 'createdAt' as const,
  defaultOrder: SortOrder.DESC,
};

@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly templateService: AutomationTemplateService,
    private readonly runnerService: AutomationRunnerService,
  ) {}

  async listAutomations(
    tenantId: string,
    query: GetAutomationsQueryDto,
  ): Promise<PaginatedResponse<AutomationWorkflowResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhereClause(tenantId, query);

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.automationWorkflow.findMany({
        where,
        select: workflowSelect,
        orderBy: buildOrderBy(
          query.sortBy,
          query.sortOrder,
          AUTOMATION_SORT_CONFIG,
        ),
        skip,
        take,
      }),
      this.prisma.automationWorkflow.count({ where }),
    ]);

    return buildPaginatedResponse(
      items.map(toWorkflowResponse),
      page,
      limit,
      totalItems,
    );
  }

  async getAutomation(
    tenantId: string,
    id: string,
  ): Promise<AutomationWorkflowResponse> {
    const workflow = await this.findWorkflowOrThrow(tenantId, id);
    return toWorkflowResponse(workflow);
  }

  async createAutomation(
    tenantId: string,
    userId: string,
    dto: CreateAutomationDto,
  ): Promise<AutomationWorkflowResponse> {
    this.templateService.validateActions(
      dto.actions.map((action) => ({
        actionType: action.actionType,
        configuration: action.configuration,
        executionOrder: action.executionOrder,
      })),
    );

    const workflow = await this.prisma.automationWorkflow.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        trigger: dto.trigger,
        enabled: dto.enabled ?? true,
        createdByUserId: userId,
        conditions: {
          create: dto.conditions.map((condition) => ({
            field: condition.field,
            operator: condition.operator,
            value: condition.value ?? null,
          })),
        },
        actions: {
          create: dto.actions.map((action) => ({
            actionType: action.actionType,
            configuration: action.configuration as Prisma.InputJsonValue,
            executionOrder: action.executionOrder,
          })),
        },
      },
      select: workflowSelect,
    });

    await this.cacheService.invalidateAutomationWorkflows(tenantId, dto.trigger);

    return toWorkflowResponse(workflow);
  }

  async updateAutomation(
    tenantId: string,
    id: string,
    dto: UpdateAutomationDto,
  ): Promise<AutomationWorkflowResponse> {
    const existing = await this.findWorkflowOrThrow(tenantId, id);

    if (dto.actions) {
      this.templateService.validateActions(
        dto.actions.map((action) => ({
          actionType: action.actionType as AutomationActionType,
          configuration: action.configuration,
          executionOrder: action.executionOrder,
        })),
      );
    }

    const workflow = await this.prisma.$transaction(async (tx) => {
      if (dto.conditions) {
        await tx.automationCondition.deleteMany({ where: { workflowId: id } });
        await tx.automationCondition.createMany({
          data: dto.conditions.map((condition) => ({
            workflowId: id,
            field: condition.field,
            operator: condition.operator,
            value: condition.value ?? null,
          })),
        });
      }

      if (dto.actions) {
        await tx.automationAction.deleteMany({ where: { workflowId: id } });
        await tx.automationAction.createMany({
          data: dto.actions.map((action) => ({
            workflowId: id,
            actionType: action.actionType,
            configuration: action.configuration as Prisma.InputJsonValue,
            executionOrder: action.executionOrder,
          })),
        });
      }

      return tx.automationWorkflow.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() ?? null }
            : {}),
          ...(dto.trigger !== undefined ? { trigger: dto.trigger } : {}),
          ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        },
        select: workflowSelect,
      });
    });

    await this.cacheService.invalidateAutomationWorkflows(tenantId);
    if (dto.trigger && dto.trigger !== existing.trigger) {
      await this.cacheService.invalidateAutomationWorkflows(
        tenantId,
        existing.trigger,
      );
    }

    return toWorkflowResponse(workflow);
  }

  async deleteAutomation(
    tenantId: string,
    id: string,
  ): Promise<{ id: string }> {
    const workflow = await this.findWorkflowOrThrow(tenantId, id);

    await this.prisma.automationWorkflow.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        enabled: false,
      },
    });

    await this.cacheService.invalidateAutomationWorkflows(
      tenantId,
      workflow.trigger,
    );

    return { id };
  }

  async enableAutomation(
    tenantId: string,
    id: string,
  ): Promise<AutomationWorkflowResponse> {
    const workflow = await this.findWorkflowOrThrow(tenantId, id);

    const updated = await this.prisma.automationWorkflow.update({
      where: { id: workflow.id },
      data: { enabled: true },
      select: workflowSelect,
    });

    await this.cacheService.invalidateAutomationWorkflows(
      tenantId,
      workflow.trigger,
    );

    return toWorkflowResponse(updated);
  }

  async disableAutomation(
    tenantId: string,
    id: string,
  ): Promise<AutomationWorkflowResponse> {
    const workflow = await this.findWorkflowOrThrow(tenantId, id);

    const updated = await this.prisma.automationWorkflow.update({
      where: { id: workflow.id },
      data: { enabled: false },
      select: workflowSelect,
    });

    await this.cacheService.invalidateAutomationWorkflows(
      tenantId,
      workflow.trigger,
    );

    return toWorkflowResponse(updated);
  }

  async testAutomation(
    tenantId: string,
    id: string,
    dto: TestAutomationDto,
  ): Promise<AutomationTestResult> {
    return this.runnerService.testWorkflow(
      tenantId,
      id,
      dto.entityType as AutomationEntityType,
      dto.entityId,
      dto.context,
    );
  }

  async listExecutions(
    tenantId: string,
    workflowId: string,
    query: GetExecutionsQueryDto,
  ): Promise<PaginatedResponse<AutomationExecutionResponse>> {
    await this.findWorkflowOrThrow(tenantId, workflowId);

    const { page, limit, skip, take } = getPaginationParams(query);
    const where: Prisma.AutomationExecutionWhereInput = {
      tenantId,
      workflowId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.automationExecution.findMany({
        where,
        select: executionSelect,
        orderBy: buildOrderBy(
          query.sortBy,
          query.sortOrder,
          EXECUTION_SORT_CONFIG,
        ),
        skip,
        take,
      }),
      this.prisma.automationExecution.count({ where }),
    ]);

    return buildPaginatedResponse(
      items.map(toExecutionResponse),
      page,
      limit,
      totalItems,
    );
  }

  private buildWhereClause(
    tenantId: string,
    query: GetAutomationsQueryDto,
  ): Prisma.AutomationWorkflowWhereInput {
    const search = normalizeSearch(query.search);

    return {
      tenantId,
      deletedAt: null,
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
      ...(query.trigger ? { trigger: query.trigger } : {}),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  private async findWorkflowOrThrow(tenantId: string, id: string) {
    const workflow = await this.prisma.automationWorkflow.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: workflowSelect,
    });

    if (!workflow) {
      throw new NotFoundException('Automation workflow not found');
    }

    return workflow;
  }
}
