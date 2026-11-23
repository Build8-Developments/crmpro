-- AlterEnum
ALTER TYPE "LeadActivityEventType" ADD VALUE 'DEAL_RESERVED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'DEAL_CONTRACTED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'DEAL_CANCELLED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'DEAL_UPDATED';

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('RESERVED', 'CONTRACTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TargetMetric" AS ENUM ('DEALS', 'REVENUE', 'COMMISSION', 'INTERACTIONS', 'VISITS');

-- CreateTable
CREATE TABLE "Deal" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "projectId" UUID,
    "agentId" UUID,
    "unitType" TEXT NOT NULL,
    "unitCode" TEXT,
    "price" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "downPaymentPct" DECIMAL(5,2),
    "paymentPlan" TEXT,
    "commissionPct" DECIMAL(5,2),
    "commissionAmount" DECIMAL(14,2),
    "status" "DealStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "notes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "period" TEXT NOT NULL,
    "metric" "TargetMetric" NOT NULL,
    "value" DECIMAL(16,2) NOT NULL,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSpend" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDailyStat" (
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "interactions" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "whatsapps" INTEGER NOT NULL DEFAULT 0,
    "meetings" INTEGER NOT NULL DEFAULT 0,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "answered" INTEGER NOT NULL DEFAULT 0,
    "tasksDue" INTEGER NOT NULL DEFAULT 0,
    "tasksDone" INTEGER NOT NULL DEFAULT 0,
    "tasksOverdue" INTEGER NOT NULL DEFAULT 0,
    "tasksSnoozed" INTEGER NOT NULL DEFAULT 0,
    "slaHits" INTEGER NOT NULL DEFAULT 0,
    "slaMisses" INTEGER NOT NULL DEFAULT 0,
    "firstResponseCount" INTEGER NOT NULL DEFAULT 0,
    "firstResponseMinutesTotal" INTEGER NOT NULL DEFAULT 0,
    "dealsReserved" INTEGER NOT NULL DEFAULT 0,
    "dealsContracted" INTEGER NOT NULL DEFAULT 0,
    "dealsCancelled" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDailyStat_pkey" PRIMARY KEY ("tenantId","userId","day")
);

-- CreateIndex
CREATE INDEX "Deal_tenantId_status_contractedAt_idx" ON "Deal"("tenantId", "status", "contractedAt");

-- CreateIndex
CREATE INDEX "Deal_tenantId_reservedAt_idx" ON "Deal"("tenantId", "reservedAt");

-- CreateIndex
CREATE INDEX "Deal_tenantId_agentId_idx" ON "Deal"("tenantId", "agentId");

-- CreateIndex
CREATE INDEX "Deal_leadId_idx" ON "Deal"("leadId");

-- CreateIndex
CREATE INDEX "Deal_projectId_idx" ON "Deal"("projectId");

-- CreateIndex
CREATE INDEX "Target_tenantId_period_idx" ON "Target"("tenantId", "period");

-- CreateIndex
CREATE INDEX "SourceSpend_tenantId_period_idx" ON "SourceSpend"("tenantId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "SourceSpend_tenantId_sourceId_period_key" ON "SourceSpend"("tenantId", "sourceId", "period");

-- CreateIndex
CREATE INDEX "UserDailyStat_tenantId_day_idx" ON "UserDailyStat"("tenantId", "day");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Target" ADD CONSTRAINT "Target_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSpend" ADD CONSTRAINT "SourceSpend_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceSpend" ADD CONSTRAINT "SourceSpend_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyStat" ADD CONSTRAINT "UserDailyStat_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDailyStat" ADD CONSTRAINT "UserDailyStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Integrity Prisma can't express ------------------------------------------
-- One live (not cancelled) deal per lead.
CREATE UNIQUE INDEX "Deal_leadId_live_key" ON "Deal"("leadId") WHERE "status" <> 'CANCELLED';

ALTER TABLE "Deal"
  ADD CONSTRAINT "Deal_price_check" CHECK ("price" >= 0),
  ADD CONSTRAINT "Deal_downPaymentPct_check" CHECK ("downPaymentPct" IS NULL OR ("downPaymentPct" >= 0 AND "downPaymentPct" <= 100)),
  ADD CONSTRAINT "Deal_commissionPct_check" CHECK ("commissionPct" IS NULL OR ("commissionPct" >= 0 AND "commissionPct" <= 100)),
  ADD CONSTRAINT "Deal_commissionAmount_check" CHECK ("commissionAmount" IS NULL OR "commissionAmount" >= 0);

-- One target per (person | workspace, month, metric). NULL userId = workspace.
CREATE UNIQUE INDEX "Target_user_period_metric_key" ON "Target"("tenantId", "userId", "period", "metric") WHERE "userId" IS NOT NULL;
CREATE UNIQUE INDEX "Target_workspace_period_metric_key" ON "Target"("tenantId", "period", "metric") WHERE "userId" IS NULL;

ALTER TABLE "Target"
  ADD CONSTRAINT "Target_period_check" CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT "Target_value_check" CHECK ("value" >= 0);

ALTER TABLE "SourceSpend"
  ADD CONSTRAINT "SourceSpend_period_check" CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT "SourceSpend_amount_check" CHECK ("amount" >= 0);


-- Permissions ----------------------------------------------------------------
INSERT INTO "Permission" ("id", "key", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'deal.read', 'View deals on won leads', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'deal.write', 'Record and update deals on won leads', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'deal.cancel', 'Cancel a deal (re-opens the lead)', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'target.read', 'View monthly targets', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'target.manage', 'Set monthly targets for people and the workspace', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'spend.manage', 'Enter monthly marketing spend per lead source', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Everyone who can see leads sees deals and their own targets; whoever can
-- edit leads records deals (agents win their own leads).
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('deal.read', 'target.read')
WHERE r."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" k ON k."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND k."key" = 'lead.read'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'deal.write'
WHERE r."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp JOIN "Permission" k ON k."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND k."key" = 'lead.update'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Cancelling deals and setting targets: Owner, Manager, and custom roles that
-- already distribute leads (lead.assign). Never the system Agent role.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('deal.cancel', 'target.manage')
WHERE r."deletedAt" IS NULL
  AND (
    (r."isSystem" AND r."name" IN ('Owner', 'Manager'))
    OR (
      NOT r."isSystem"
      AND EXISTS (
        SELECT 1 FROM "RolePermission" rp JOIN "Permission" k ON k."id" = rp."permissionId"
        WHERE rp."roleId" = r."id" AND k."key" = 'lead.assign'
      )
    )
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Spend is the owner's: system Owner plus custom roles with billing.manage.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'spend.manage'
WHERE r."deletedAt" IS NULL
  AND (
    (r."isSystem" AND r."name" = 'Owner')
    OR (
      NOT r."isSystem"
      AND EXISTS (
        SELECT 1 FROM "RolePermission" rp JOIN "Permission" k ON k."id" = rp."permissionId"
        WHERE rp."roleId" = r."id" AND k."key" = 'billing.manage'
      )
    )
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

