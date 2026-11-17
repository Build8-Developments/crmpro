-- CreateEnum
CREATE TYPE "CustomFieldEntity" AS ENUM ('LEAD');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'URL');

-- AlterEnum
ALTER TYPE "FileAssetCategory" ADD VALUE 'TENANT_LOGO';

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "logoFileAssetId" UUID;

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "entity" "CustomFieldEntity" NOT NULL DEFAULT 'LEAD',
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
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
CREATE TABLE "SavedView" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "sort" JSONB NOT NULL DEFAULT '{}',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_tenantId_entity_archivedAt_idx" ON "CustomFieldDefinition"("tenantId", "entity", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_tenantId_entity_key_key" ON "CustomFieldDefinition"("tenantId", "entity", "key");

-- CreateIndex
CREATE INDEX "SavedView_tenantId_userId_idx" ON "SavedView"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "SavedView_tenantId_isShared_idx" ON "SavedView"("tenantId", "isShared");

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Plan 10 permissions: owners and managers (system roles) by default.
INSERT INTO "Permission" ("id", "key", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'custom-field.manage', 'Define and archive custom lead fields', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'saved-view.share', 'Share saved lead views with the workspace', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('custom-field.manage', 'saved-view.share')
  AND r."deletedAt" IS NULL
  AND r."isSystem" AND r."name" IN ('Owner', 'Manager')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
