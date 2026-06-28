-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_ASSIGNED', 'LEAD_STAGE_CHANGED', 'LEAD_WON', 'LEAD_LOST', 'IMPORT_COMPLETED', 'EXPORT_COMPLETED', 'FILE_UPLOADED', 'TASK_OVERDUE', 'SCHEDULE');

-- CreateEnum
CREATE TYPE "AutomationConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS', 'NOT_CONTAINS', 'IN', 'NOT_IN', 'IS_EMPTY', 'IS_NOT_EMPTY');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('CREATE_NOTIFICATION', 'CREATE_TASK', 'SEND_EMAIL', 'ASSIGN_AGENT', 'MOVE_STAGE', 'ADD_TAG', 'REMOVE_TAG', 'CREATE_NOTE', 'CREATE_ACTIVITY', 'WEBHOOK', 'DELAY');

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'PARTIAL');

-- CreateTable
CREATE TABLE "AutomationWorkflow" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "trigger" "AutomationTriggerType" NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationCondition" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "operator" "AutomationConditionOperator" NOT NULL,
    "value" TEXT,

    CONSTRAINT "AutomationCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationAction" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "actionType" "AutomationActionType" NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "executionOrder" INTEGER NOT NULL,

    CONSTRAINT "AutomationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecution" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationWorkflow_tenantId_enabled_deletedAt_idx" ON "AutomationWorkflow"("tenantId", "enabled", "deletedAt");

-- CreateIndex
CREATE INDEX "AutomationWorkflow_tenantId_trigger_enabled_deletedAt_idx" ON "AutomationWorkflow"("tenantId", "trigger", "enabled", "deletedAt");

-- CreateIndex
CREATE INDEX "AutomationCondition_workflowId_idx" ON "AutomationCondition"("workflowId");

-- CreateIndex
CREATE INDEX "AutomationAction_workflowId_executionOrder_idx" ON "AutomationAction"("workflowId", "executionOrder");

-- CreateIndex
CREATE INDEX "AutomationExecution_workflowId_createdAt_idx" ON "AutomationExecution"("workflowId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AutomationExecution_tenantId_createdAt_idx" ON "AutomationExecution"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AutomationExecution_status_idx" ON "AutomationExecution"("status");

-- AddForeignKey
ALTER TABLE "AutomationWorkflow" ADD CONSTRAINT "AutomationWorkflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationWorkflow" ADD CONSTRAINT "AutomationWorkflow_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationCondition" ADD CONSTRAINT "AutomationCondition_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationAction" ADD CONSTRAINT "AutomationAction_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "AutomationWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
