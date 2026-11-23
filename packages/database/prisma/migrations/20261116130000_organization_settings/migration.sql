-- AlterEnum
ALTER TYPE "FileAssetCategory" ADD VALUE 'LOGO';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "logoFileId" UUID;

-- CreateTable
CREATE TABLE "TenantSettings" (
    "tenantId" UUID NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'EG',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 6,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" UUID,

    CONSTRAINT "TenantSettings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_logoFileId_key" ON "Tenant"("logoFileId");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSettings" ADD CONSTRAINT "TenantSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: every existing tenant gets a settings row with defaults.
INSERT INTO "TenantSettings" ("tenantId", "updatedAt")
SELECT t."id", CURRENT_TIMESTAMP
FROM "Tenant" t
ON CONFLICT ("tenantId") DO NOTHING;

-- New permissions for Organization settings.
INSERT INTO "Permission" ("id", "key", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'settings.read', 'View organization settings, plan and usage', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'settings.manage', 'Change organization settings and branding', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Owner: read + manage. Manager: read. Matches the provisioning defaults in
-- packages/shared/src/bootstrap/tenant-bootstrap.constants.ts.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" IN ('settings.read', 'settings.manage')
WHERE r."isSystem" = true
  AND r."deletedAt" IS NULL
  AND (
    r."name" = 'Owner'
    OR (r."name" = 'Manager' AND p."key" = 'settings.read')
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
