-- AlterEnum
ALTER TYPE "LeadActivityEventType" ADD VALUE 'LEAD_MERGED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "mergedIntoId" UUID;

-- CreateIndex
CREATE INDEX "Lead_mergedIntoId_idx" ON "Lead"("mergedIntoId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Merging duplicate leads ----------------------------------------------------
INSERT INTO "Permission" ("id", "key", "description", "createdAt")
VALUES
  (gen_random_uuid(), 'lead.merge', 'Merge duplicate leads into one', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- Owners and managers merge; custom roles get it when they already hand out
-- leads (lead.assign). System Agent roles never do.
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'lead.merge'
  AND r."deletedAt" IS NULL
  AND (
    (r."isSystem" AND r."name" IN ('Owner', 'Manager'))
    OR (
      NOT r."isSystem"
      AND EXISTS (
        SELECT 1 FROM "RolePermission" rp
        JOIN "Permission" ap ON ap."id" = rp."permissionId"
        WHERE rp."roleId" = r."id" AND ap."key" = 'lead.assign'
      )
    )
  )
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
