
-- CreateEnum
CREATE TYPE "ContractTerminationMode" AS ENUM ('FULL_ACCESS', 'READ_ONLY', 'IMMEDIATE');

-- CreateEnum
CREATE TYPE "CustomFieldEntity" AS ENUM ('LEAD');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL');

-- CreateEnum
CREATE TYPE "ProjectUpdateType" AS ENUM ('PRICE_CHANGE', 'NEW_PHASE', 'AVAILABILITY', 'GENERAL');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_UPDATE';

-- AlterTable
ALTER TABLE "TenantContract" ADD COLUMN     "accessEndsAt" TIMESTAMP(3),
ADD COLUMN     "planSnapshot" JSONB,
ADD COLUMN     "terminatedAt" TIMESTAMP(3),
ADD COLUMN     "terminationMode" "ContractTerminationMode";

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "entity" "CustomFieldEntity" NOT NULL DEFAULT 'LEAD',
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "CustomFieldType" NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUpdate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "authorUserId" UUID,
    "type" "ProjectUpdateType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_tenantId_entity_archivedAt_idx" ON "CustomFieldDefinition"("tenantId", "entity", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_tenantId_entity_key_key" ON "CustomFieldDefinition"("tenantId", "entity", "key");

-- CreateIndex
CREATE INDEX "ProjectUpdate_tenantId_createdAt_idx" ON "ProjectUpdate"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectUpdate_projectId_createdAt_idx" ON "ProjectUpdate"("projectId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Custom field keys are lower_snake_case, 1-40 chars, starting with a letter.
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_key_check"
  CHECK ("key" ~ '^[a-z][a-z0-9_]{0,39}$');

-- Contracts terminated before modes existed kept full access through grace.
UPDATE "TenantContract"
SET "terminatedAt" = "updatedAt",
    "terminationMode" = 'FULL_ACCESS',
    "accessEndsAt" = COALESCE("contractEndAt", "updatedAt")
      + make_interval(days => COALESCE("gracePeriodDays", 0))
WHERE "status" = 'TERMINATED' AND "terminatedAt" IS NULL;

-- Snapshot the plan of contracts already in force, so later plan edits
-- don't change them (same shape the admin API writes at activation).
UPDATE "TenantContract" c
SET "planSnapshot" = jsonb_build_object(
  'version', 1,
  'planId', p."id",
  'name', p."name",
  'price', c."agreedPrice",
  'currency', c."currency",
  'quotas', jsonb_build_object(
    'maxUsers', p."maxUsers",
    'maxLeads', p."maxLeads",
    'maxProjects', p."maxProjects",
    'maxStorageBytes', CASE WHEN p."maxStorageBytes" IS NULL THEN NULL ELSE p."maxStorageBytes"::text END
  ),
  'featureFlags', p."featureFlags",
  'capturedAt', to_jsonb(now())
)
FROM "SubscriptionPlan" p
WHERE p."id" = c."planId" AND c."status" IN ('ACTIVE', 'EXPIRED', 'TERMINATED') AND c."planSnapshot" IS NULL;
