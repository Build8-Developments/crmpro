-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CALL', 'WHATSAPP', 'MEETING', 'SITE_VISIT', 'EMAIL', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadActivityEventType" ADD VALUE 'MEETING_LOGGED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'SITE_VISIT_LOGGED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "firstContactedAt" TIMESTAMP(3),
ADD COLUMN     "nextFollowUpAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "leadId" UUID,
    "assignedUserId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TaskType" NOT NULL DEFAULT 'FOLLOW_UP',
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "overdueNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_tenantId_assignedUserId_status_dueAt_idx" ON "Task"("tenantId", "assignedUserId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_tenantId_leadId_idx" ON "Task"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "Task_status_dueAt_idx" ON "Task"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Lead_tenantId_nextFollowUpAt_idx" ON "Lead"("tenantId", "nextFollowUpAt");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Follow-ups & activity logging permissions (Plan 07) ---------------------------
INSERT INTO "Permission" ("id", "key", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'lead-activity.create', 'Log calls, WhatsApp, emails, meetings and visits', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'task.read', 'View follow-ups', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'task.create', 'Schedule follow-ups', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'task.update', 'Update and complete follow-ups', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'task.delete', 'Delete follow-ups', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Anyone who can work leads (lead.update) can log activity and run follow-ups.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('lead-activity.create', 'task.read', 'task.create', 'task.update')
  AND r."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp
    JOIN "Permission" lp ON lp."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND lp."key" = 'lead.update'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Deleting follow-ups follows lead deletion rights (Owner/Manager by default).
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'task.delete'
  AND r."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp
    JOIN "Permission" lp ON lp."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND lp."key" = 'lead.delete'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Backfill: existing leads with a contact timestamp count as contacted.
UPDATE "Lead" SET "firstContactedAt" = "lastContactedAt"
WHERE "firstContactedAt" IS NULL AND "lastContactedAt" IS NOT NULL;
