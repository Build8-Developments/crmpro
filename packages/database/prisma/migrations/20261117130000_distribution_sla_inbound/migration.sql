-- CreateEnum
CREATE TYPE "SlaAction" AS ENUM ('NOTIFY', 'REASSIGN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadActivityEventType" ADD VALUE 'SLA_BREACHED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'LEAD_RESUBMITTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SLA_BREACHED';
ALTER TYPE "NotificationType" ADD VALUE 'LEAD_RESUBMITTED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "slaBreachedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastAutoAssignedAt" TIMESTAMP(3),
ADD COLUMN     "receivesLeads" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "TenantSettings" (
    "tenantId" UUID NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "defaultCountryCode" TEXT NOT NULL DEFAULT 'EG',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "defaultLocale" TEXT NOT NULL DEFAULT 'ar',
    "autoAssignEnabled" BOOLEAN NOT NULL DEFAULT false,
    "slaFirstResponseMinutes" INTEGER,
    "slaAction" "SlaAction" NOT NULL DEFAULT 'NOTIFY',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdByUserId" UUID NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_revokedAt_idx" ON "ApiKey"("tenantId", "revokedAt");

-- CreateIndex
CREATE INDEX "Lead_tenantId_slaBreachedAt_idx" ON "Lead"("tenantId", "slaBreachedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tenantId_externalId_key" ON "Lead"("tenantId", "externalId");

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Plan 09: settings row for every existing tenant (defaults apply).
INSERT INTO "TenantSettings" ("tenantId", "updatedAt")
SELECT t."id", CURRENT_TIMESTAMP FROM "Tenant" t
ON CONFLICT ("tenantId") DO NOTHING;

-- Owners don't receive auto-distributed leads unless they opt in.
UPDATE "User" u SET "receivesLeads" = false
FROM "Role" r
WHERE u."roleId" = r."id" AND r."isSystem" AND r."name" = 'Owner';

-- Existing assignments start their SLA clock at the last assignment we know of.
UPDATE "Lead" SET "assignedAt" = "updatedAt"
WHERE "assignedUserId" IS NOT NULL AND "assignedAt" IS NULL;

INSERT INTO "Permission" ("id", "key", "description", "createdAt")
VALUES (gen_random_uuid(), 'api-key.manage', 'Create and revoke inbound API keys', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Only owners (and custom roles that already manage the tenant) get API keys.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'api-key.manage'
  AND r."deletedAt" IS NULL
  AND (
    (r."isSystem" AND r."name" = 'Owner')
    OR (NOT r."isSystem" AND EXISTS (
      SELECT 1 FROM "RolePermission" rp
      JOIN "Permission" tp ON tp."id" = rp."permissionId"
      WHERE rp."roleId" = r."id" AND tp."key" = 'tenant.manage'
    ))
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
