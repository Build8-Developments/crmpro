-- CreateEnum
CREATE TYPE "InteractionChannel" AS ENUM ('CALL', 'WHATSAPP', 'MEETING', 'SITE_VISIT', 'VIDEO_CALL', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "InteractionDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "InteractionOutcome" AS ENUM ('NO_ANSWER', 'BUSY', 'SWITCHED_OFF', 'WRONG_NUMBER', 'ANSWERED_INTERESTED', 'ANSWERED_NOT_NOW', 'CALLBACK_REQUESTED', 'NOT_INTERESTED', 'MEETING_BOOKED', 'VISIT_BOOKED', 'VISIT_DONE', 'OFFER_SENT', 'NEGOTIATING', 'RESERVED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CALL', 'WHATSAPP', 'MEETING', 'SITE_VISIT', 'SEND_OFFER', 'PAPERWORK', 'REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "TaskOrigin" AS ENUM ('SYSTEM', 'SELF', 'MANAGER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'DONE', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeadHeat" AS ENUM ('HOT', 'WARM', 'COLD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadActivityEventType" ADD VALUE 'INTERACTION_LOGGED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'TASK_RESCHEDULED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'TASK_SKIPPED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "contactAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstContactedAt" TIMESTAMP(3),
ADD COLUMN     "heat" "LeadHeat" NOT NULL DEFAULT 'WARM',
ADD COLUMN     "lostNote" TEXT,
ADD COLUMN     "lostReasonId" UUID,
ADD COLUMN     "nextTaskDueAt" TIMESTAMP(3),
ADD COLUMN     "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "unansweredStreak" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LostReason" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recyclable" BOOLEAN NOT NULL DEFAULT false,
    "recycleAfterDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LostReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "InteractionChannel" NOT NULL,
    "direction" "InteractionDirection" NOT NULL DEFAULT 'OUTBOUND',
    "outcome" "InteractionOutcome" NOT NULL,
    "durationSeconds" INTEGER,
    "note" TEXT,
    "projectId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "leadId" UUID,
    "assigneeId" UUID NOT NULL,
    "createdByUserId" UUID,
    "type" "TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "origin" "TaskOrigin" NOT NULL DEFAULT 'SELF',
    "ruleKey" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "completedInteractionId" UUID,
    "skipReason" TEXT,
    "snoozeCount" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LostReason_tenantId_sortOrder_idx" ON "LostReason"("tenantId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LostReason_tenantId_name_key" ON "LostReason"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Interaction_tenantId_occurredAt_idx" ON "Interaction"("tenantId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "Interaction_tenantId_userId_occurredAt_idx" ON "Interaction"("tenantId", "userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "Interaction_leadId_occurredAt_idx" ON "Interaction"("leadId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "Task_tenantId_assigneeId_status_dueAt_idx" ON "Task"("tenantId", "assigneeId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Task_leadId_status_idx" ON "Task"("leadId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_dueAt_idx" ON "Task"("tenantId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "Lead_tenantId_assignedUserId_nextTaskDueAt_idx" ON "Lead"("tenantId", "assignedUserId", "nextTaskDueAt");

-- CreateIndex
CREATE INDEX "Lead_lostReasonId_idx" ON "Lead"("lostReasonId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_lostReasonId_fkey" FOREIGN KEY ("lostReasonId") REFERENCES "LostReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostReason" ADD CONSTRAINT "LostReason_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedInteractionId_fkey" FOREIGN KEY ("completedInteractionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written: invariants Prisma cannot express, and backfills.
-- See docs/product/workflow-engine-spec.md.
-- ---------------------------------------------------------------------------

-- Playbook rules are idempotent: at most one OPEN task per (lead, rule).
CREATE UNIQUE INDEX "Task_open_lead_rule_key"
  ON "Task" ("leadId", "ruleKey")
  WHERE "status" = 'OPEN' AND "leadId" IS NOT NULL AND "ruleKey" IS NOT NULL;

-- Lost-reason names are unique per tenant, case-insensitively.
CREATE UNIQUE INDEX "LostReason_tenant_lower_name_key"
  ON "LostReason" ("tenantId", lower("name"));

-- Default lost reasons for every existing tenant (same list as
-- DEFAULT_LOST_REASONS in packages/shared/src/bootstrap).
INSERT INTO "LostReason" ("id", "tenantId", "name", "sortOrder", "recyclable", "recycleAfterDays", "updatedAt")
SELECT gen_random_uuid(), t."id", r.name, r.sort_order, r.recyclable, r.recycle_after_days, CURRENT_TIMESTAMP
FROM "Tenant" t
CROSS JOIN (VALUES
  ('Budget too low',            1, true,  120),
  ('Bought elsewhere',          2, false, NULL),
  ('Postponed decision',        3, true,  90),
  ('Unreachable',               4, true,  60),
  ('Wants ready-to-move',       5, true,  180),
  ('Location not suitable',     6, false, NULL),
  ('Payment plan not suitable', 7, true,  120),
  ('Fake or duplicate lead',    8, false, NULL)
) AS r(name, sort_order, recyclable, recycle_after_days)
ON CONFLICT ("tenantId", "name") DO NOTHING;

-- stageEnteredAt = time of the last stage change, else creation.
UPDATE "Lead" l
SET "stageEnteredAt" = COALESCE(sc.last_change, l."createdAt")
FROM (
  SELECT l2."id", MAX(la."createdAt") AS last_change
  FROM "Lead" l2
  LEFT JOIN "LeadActivity" la
    ON la."leadId" = l2."id" AND la."eventType" = 'STAGE_CHANGED'
  GROUP BY l2."id"
) sc
WHERE sc."id" = l."id";

-- closedAt for leads already sitting in a WON/LOST stage.
UPDATE "Lead" l
SET "closedAt" = COALESCE(
  (SELECT MAX(la."createdAt") FROM "LeadActivity" la
   WHERE la."leadId" = l."id" AND la."eventType" = 'STAGE_CHANGED'
     AND (la."metadata"->>'isClosedTransition')::boolean IS TRUE),
  l."stageEnteredAt")
FROM "PipelineStage" ps
WHERE ps."id" = l."pipelineStageId" AND ps."isClosed" = true;

-- firstContactedAt = first logged call/WhatsApp/email by the assignee.
UPDATE "Lead" l
SET "firstContactedAt" = fc.first_at
FROM (
  SELECT la."leadId", MIN(la."createdAt") AS first_at
  FROM "LeadActivity" la
  JOIN "Lead" l3 ON l3."id" = la."leadId"
  WHERE la."eventType" IN ('CALL_LOGGED', 'WHATSAPP_LOGGED', 'EMAIL_LOGGED')
    AND la."actorUserId" = l3."assignedUserId"
  GROUP BY la."leadId"
) fc
WHERE fc."leadId" = l."id";

-- Heat from existing signals: HOT interest → HOT; touched in 21 days → WARM;
-- otherwise COLD.
UPDATE "Lead" l
SET "heat" = CASE
  WHEN EXISTS (
    SELECT 1 FROM "LeadProjectInterest" i
    WHERE i."leadId" = l."id" AND i."interestLevel" = 'HOT'
  ) THEN 'HOT'::"LeadHeat"
  WHEN l."lastContactedAt" > CURRENT_TIMESTAMP - INTERVAL '21 days' THEN 'WARM'::"LeadHeat"
  ELSE 'COLD'::"LeadHeat"
END;
