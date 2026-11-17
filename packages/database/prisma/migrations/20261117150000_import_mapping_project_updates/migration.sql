-- CreateEnum
CREATE TYPE "ImportDuplicatePolicy" AS ENUM ('SKIP', 'CREATE');

-- CreateEnum
CREATE TYPE "ProjectUpdateType" AS ENUM ('PRICE_CHANGE', 'NEW_PHASE', 'AVAILABILITY', 'GENERAL');

-- AlterEnum
ALTER TYPE "NotificationPreferenceCategory" ADD VALUE 'PROJECT_UPDATES';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PROJECT_UPDATE';

-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "duplicatePolicy" "ImportDuplicatePolicy" NOT NULL DEFAULT 'SKIP',
ADD COLUMN     "options" JSONB,
ADD COLUMN     "skippedRows" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "importJobId" UUID,
ADD COLUMN     "importRowNumber" INTEGER;

-- CreateTable
CREATE TABLE "ProjectUpdate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "type" "ProjectUpdateType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectUpdate_tenantId_createdAt_idx" ON "ProjectUpdate"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ProjectUpdate_projectId_createdAt_idx" ON "ProjectUpdate"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_importJobId_importRowNumber_key" ON "Lead"("importJobId", "importRowNumber");

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

