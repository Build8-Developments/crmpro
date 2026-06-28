-- AlterEnum
ALTER TYPE "LeadActivityEventType" ADD VALUE 'TASK_CREATED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'TASK_COMPLETED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'TASK_CANCELLED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'TASK_COMPLETED';

-- AlterEnum
ALTER TYPE "NotificationPreferenceCategory" ADD VALUE 'TASK_UPDATES';

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CALL', 'MEETING', 'SITE_VISIT', 'EMAIL', 'FOLLOW_UP', 'DOCUMENT_COLLECTION', 'PAYMENT', 'REMINDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "leadId" UUID,
    "projectId" UUID,
    "developerId" UUID,
    "assignedUserId" UUID,
    "createdByUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'CUSTOM',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reminderAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_tenantId_deletedAt_idx" ON "Task"("tenantId", "deletedAt");
CREATE INDEX "Task_tenantId_assignedUserId_status_idx" ON "Task"("tenantId", "assignedUserId", "status");
CREATE INDEX "Task_tenantId_status_priority_idx" ON "Task"("tenantId", "status", "priority");
CREATE INDEX "Task_tenantId_dueAt_idx" ON "Task"("tenantId", "dueAt");
CREATE INDEX "Task_tenantId_leadId_idx" ON "Task"("tenantId", "leadId");
CREATE INDEX "Task_assignedUserId_idx" ON "Task"("assignedUserId");
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
