-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teamId" UUID;

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "leaderUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Team_tenantId_deletedAt_idx" ON "Team"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "Team_leaderUserId_idx" ON "Team"("leaderUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_tenantId_name_key" ON "Team"("tenantId", "name");

-- CreateIndex
CREATE INDEX "User_tenantId_teamId_idx" ON "User"("tenantId", "teamId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Lead data scoping (Plan 06) -------------------------------------------------
-- Users without lead.read-team / lead.read-all only see leads assigned to them.

INSERT INTO "Permission" ("id", "key", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'lead.read-team', 'View leads of the user''s team(s) and unassigned leads', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'lead.read-all', 'View every lead in the organization', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'team.read', 'View teams', CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'team.manage', 'Create teams and manage membership', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Owners and custom roles keep today's behaviour (whole-tenant visibility).
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'lead.read-all'
  AND r."deletedAt" IS NULL
  AND ((r."isSystem" AND r."name" = 'Owner') OR NOT r."isSystem")
  AND EXISTS (
    SELECT 1 FROM "RolePermission" rp
    JOIN "Permission" lp ON lp."id" = rp."permissionId"
    WHERE rp."roleId" = r."id" AND lp."key" = 'lead.read'
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- System managers move to team scope.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'lead.read-team'
  AND r."isSystem" AND r."name" = 'Manager'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" IN ('team.read', 'team.manage')
  AND r."isSystem" AND r."name" IN ('Owner', 'Manager')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- System agents no longer redistribute leads.
DELETE FROM "RolePermission" rp
USING "Role" r, "Permission" p
WHERE rp."roleId" = r."id"
  AND rp."permissionId" = p."id"
  AND r."isSystem" AND r."name" = 'Agent'
  AND p."key" = 'lead.assign';
