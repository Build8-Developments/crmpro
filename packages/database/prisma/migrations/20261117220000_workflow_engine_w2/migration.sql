-- AlterEnum
ALTER TYPE "LeadActivityEventType" ADD VALUE 'SLA_BREACHED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ESCALATION';

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "dailyInteractionGoal" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN     "escalateAfterMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "firstContactSlaMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "workdayEndMinute" INTEGER NOT NULL DEFAULT 1140,
ADD COLUMN     "workdayStartMinute" INTEGER NOT NULL DEFAULT 600,
ADD COLUMN     "workingDays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 6]::INTEGER[];

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "slaBreachedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "escalateAt" TIMESTAMP(3),
ADD COLUMN     "overdueNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Task_status_dueAt_idx" ON "Task"("status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_status_escalateAt_idx" ON "Task"("status", "escalateAt");


-- Backfill: when each assigned lead got its current owner (last assignment
-- event, else creation).
UPDATE "Lead" l
SET "assignedAt" = COALESCE(
  (
    SELECT MAX(a."createdAt")
    FROM "LeadActivity" a
    WHERE a."leadId" = l."id"
      AND a."eventType" IN ('ASSIGNED', 'REASSIGNED')
  ),
  l."createdAt"
)
WHERE l."assignedUserId" IS NOT NULL;

-- Tasks that are already due or overdue when reminders go live should not
-- all fire at once: treat them as already reminded.
UPDATE "Task"
SET "reminderSentAt" = CURRENT_TIMESTAMP
WHERE "status" = 'OPEN' AND "dueAt" < CURRENT_TIMESTAMP + INTERVAL '30 minutes';

UPDATE "Task"
SET "overdueNotifiedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'OPEN' AND "dueAt" < CURRENT_TIMESTAMP;
