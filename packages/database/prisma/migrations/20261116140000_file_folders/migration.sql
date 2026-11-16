-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "folderId" UUID;

-- CreateTable
CREATE TABLE "FileFolder" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "parentId" UUID,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FileFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileFolder_tenantId_parentId_idx" ON "FileFolder"("tenantId", "parentId");

-- CreateIndex
CREATE INDEX "FileAsset_tenantId_folderId_idx" ON "FileAsset"("tenantId", "folderId");

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FileFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileFolder" ADD CONSTRAINT "FileFolder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileFolder" ADD CONSTRAINT "FileFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FileFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileFolder" ADD CONSTRAINT "FileFolder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Sibling folder names are unique among live folders, case-insensitively.
-- Root folders have parentId NULL, so COALESCE puts them in one group.
CREATE UNIQUE INDEX "FileFolder_sibling_name_active_key"
  ON "FileFolder" (
    "tenantId",
    COALESCE("parentId", '00000000-0000-0000-0000-000000000000'::uuid),
    lower("name")
  )
  WHERE "deletedAt" IS NULL;

-- Managing any folder (rename/move/delete others' folders, reset a forgotten
-- folder password) is a separate permission from uploading files.
INSERT INTO "Permission" ("id", "key", "description", "createdAt")
VALUES (gen_random_uuid(), 'file.manage', 'Manage all folders and reset folder passwords', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
JOIN "Permission" p ON p."key" = 'file.manage'
WHERE r."isSystem" = true
  AND r."deletedAt" IS NULL
  AND r."name" IN ('Owner', 'Manager')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
