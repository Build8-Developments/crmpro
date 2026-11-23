-- CreateEnum
CREATE TYPE "ImportDuplicatePolicy" AS ENUM ('SKIP', 'CREATE');

-- AlterEnum
ALTER TYPE "LeadActivityEventType" ADD VALUE 'LEAD_RESUBMITTED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "importJobId" UUID,
ADD COLUMN     "importRowNumber" INTEGER;

-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "duplicatePolicy" "ImportDuplicatePolicy" NOT NULL DEFAULT 'SKIP',
ADD COLUMN     "options" JSONB,
ADD COLUMN     "skippedRows" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "sourceId" UUID,
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
CREATE UNIQUE INDEX "Lead_importJobId_importRowNumber_key" ON "Lead"("importJobId", "importRowNumber");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- An inbound integration's id is unique per workspace among live leads; a
-- deleted lead frees it.
CREATE UNIQUE INDEX "Lead_tenant_external_id_key"
  ON "Lead"("tenantId", "externalId")
  WHERE "externalId" IS NOT NULL AND "deletedAt" IS NULL;
