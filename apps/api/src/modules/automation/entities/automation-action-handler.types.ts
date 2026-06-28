import { AutomationActionType } from '@prisma/client';

export interface AutomationActionContext {
  tenantId: string;
  workflowId: string;
  workflowName: string;
  entityType: string;
  entityId: string;
  configuration: Record<string, unknown>;
  entityData: Record<string, unknown>;
  isTest: boolean;
  actorUserId?: string | null;
}

export interface AutomationActionResult {
  success: boolean;
  message?: string;
  skipped?: boolean;
}

export interface AutomationActionHandler {
  readonly actionType: AutomationActionType;
  execute(context: AutomationActionContext): Promise<AutomationActionResult>;
}
