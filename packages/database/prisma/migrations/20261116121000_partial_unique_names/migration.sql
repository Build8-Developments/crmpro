-- Soft-deleted Role / Developer / Project rows kept their names reserved
-- because the (tenantId, name) unique indexes covered deleted rows too.
-- Replace them with partial unique indexes over live rows only.
--
-- These partial indexes are not representable in schema.prisma (the models
-- declare a plain @@index instead). Do not use `prisma db push`, and review any
-- generated migration that tries to drop them.

DROP INDEX IF EXISTS "Role_tenantId_name_key";
CREATE UNIQUE INDEX "Role_tenantId_name_active_key"
  ON "Role"("tenantId", "name")
  WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "Developer_tenantId_name_key";
CREATE UNIQUE INDEX "Developer_tenantId_name_active_key"
  ON "Developer"("tenantId", "name")
  WHERE "deletedAt" IS NULL;

DROP INDEX IF EXISTS "Project_tenantId_name_key";
CREATE UNIQUE INDEX "Project_tenantId_name_active_key"
  ON "Project"("tenantId", "name")
  WHERE "deletedAt" IS NULL;
