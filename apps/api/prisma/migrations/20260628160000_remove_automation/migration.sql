-- DropForeignKey
ALTER TABLE "AutomationExecution" DROP CONSTRAINT "AutomationExecution_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationAction" DROP CONSTRAINT "AutomationAction_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationCondition" DROP CONSTRAINT "AutomationCondition_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationWorkflow" DROP CONSTRAINT "AutomationWorkflow_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationWorkflow" DROP CONSTRAINT "AutomationWorkflow_tenantId_fkey";

-- DropTable
DROP TABLE "AutomationExecution";

-- DropTable
DROP TABLE "AutomationAction";

-- DropTable
DROP TABLE "AutomationCondition";

-- DropTable
DROP TABLE "AutomationWorkflow";

-- DropEnum
DROP TYPE "AutomationExecutionStatus";

-- DropEnum
DROP TYPE "AutomationActionType";

-- DropEnum
DROP TYPE "AutomationConditionOperator";

-- DropEnum
DROP TYPE "AutomationTriggerType";
