import { Prisma } from '@prisma/client';
import {
  AutomationActionResponse,
  AutomationConditionResponse,
  AutomationExecutionResponse,
  AutomationWorkflowResponse,
} from '../entities/automation.types';

export const workflowSelect = {
  id: true,
  tenantId: true,
  name: true,
  description: true,
  enabled: true,
  trigger: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
  conditions: {
    select: {
      id: true,
      field: true,
      operator: true,
      value: true,
    },
    orderBy: { field: 'asc' as const },
  },
  actions: {
    select: {
      id: true,
      actionType: true,
      configuration: true,
      executionOrder: true,
    },
    orderBy: { executionOrder: 'asc' as const },
  },
} satisfies Prisma.AutomationWorkflowSelect;

export const executionSelect = {
  id: true,
  workflowId: true,
  tenantId: true,
  triggerType: true,
  entityType: true,
  entityId: true,
  status: true,
  startedAt: true,
  finishedAt: true,
  durationMs: true,
  errorMessage: true,
  createdAt: true,
} satisfies Prisma.AutomationExecutionSelect;

type WorkflowRecord = Prisma.AutomationWorkflowGetPayload<{
  select: typeof workflowSelect;
}>;

type ExecutionRecord = Prisma.AutomationExecutionGetPayload<{
  select: typeof executionSelect;
}>;

export function toConditionResponse(
  condition: WorkflowRecord['conditions'][number],
): AutomationConditionResponse {
  return {
    id: condition.id,
    field: condition.field,
    operator: condition.operator,
    value: condition.value,
  };
}

export function toActionResponse(
  action: WorkflowRecord['actions'][number],
): AutomationActionResponse {
  return {
    id: action.id,
    actionType: action.actionType,
    configuration: action.configuration as Record<string, unknown>,
    executionOrder: action.executionOrder,
  };
}

export function toWorkflowResponse(
  workflow: WorkflowRecord,
): AutomationWorkflowResponse {
  return {
    id: workflow.id,
    tenantId: workflow.tenantId,
    name: workflow.name,
    description: workflow.description,
    enabled: workflow.enabled,
    trigger: workflow.trigger,
    createdByUserId: workflow.createdByUserId,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    conditions: workflow.conditions.map(toConditionResponse),
    actions: workflow.actions.map(toActionResponse),
  };
}

export function toExecutionResponse(
  execution: ExecutionRecord,
): AutomationExecutionResponse {
  return {
    id: execution.id,
    workflowId: execution.workflowId,
    tenantId: execution.tenantId,
    triggerType: execution.triggerType,
    entityType: execution.entityType,
    entityId: execution.entityId,
    status: execution.status,
    startedAt: execution.startedAt,
    finishedAt: execution.finishedAt,
    durationMs: execution.durationMs,
    errorMessage: execution.errorMessage,
    createdAt: execution.createdAt,
  };
}
