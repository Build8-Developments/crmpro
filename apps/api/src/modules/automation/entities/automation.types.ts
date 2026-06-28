import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationExecutionStatus,
  AutomationTriggerType,
} from '@prisma/client';

export type AutomationEntityType =
  | 'lead'
  | 'import_job'
  | 'export_job'
  | 'file'
  | 'task';

export interface AutomationJobPayload {
  workflowId: string;
  tenantId: string;
  entityType: AutomationEntityType;
  entityId: string;
  triggerType: AutomationTriggerType;
  requestId?: string;
  isTest?: boolean;
  testContext?: Record<string, unknown>;
}

export interface AutomationTriggerInput {
  tenantId: string;
  triggerType: AutomationTriggerType;
  entityType: AutomationEntityType;
  entityId: string;
  context?: Record<string, unknown>;
}

export interface AutomationConditionInput {
  field: string;
  operator: AutomationConditionOperator;
  value?: string | null;
}

export interface AutomationActionInput {
  actionType: AutomationActionType;
  configuration: Record<string, unknown>;
  executionOrder: number;
}

export interface AutomationWorkflowResponse {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger: AutomationTriggerType;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  conditions: AutomationConditionResponse[];
  actions: AutomationActionResponse[];
}

export interface AutomationConditionResponse {
  id: string;
  field: string;
  operator: AutomationConditionOperator;
  value: string | null;
}

export interface AutomationActionResponse {
  id: string;
  actionType: AutomationActionType;
  configuration: Record<string, unknown>;
  executionOrder: number;
}

export interface AutomationExecutionResponse {
  id: string;
  workflowId: string;
  tenantId: string;
  triggerType: AutomationTriggerType;
  entityType: string;
  entityId: string;
  status: AutomationExecutionStatus;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface AutomationTestResult {
  conditionsMet: boolean;
  actions: Array<{
    actionType: AutomationActionType;
    executionOrder: number;
    status: 'simulated' | 'skipped' | 'failed';
    message?: string;
  }>;
}

export interface CachedAutomationWorkflow {
  id: string;
  name: string;
  tenantId: string;
  trigger: AutomationTriggerType;
  conditions: AutomationConditionInput[];
  actions: AutomationActionInput[];
}
