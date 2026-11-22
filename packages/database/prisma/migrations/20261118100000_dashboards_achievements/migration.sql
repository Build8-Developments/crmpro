
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ACHIEVEMENT';

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "showLeaderboardToAgents" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PipelineStage" ADD COLUMN     "staleAfterDays" INTEGER,
ADD COLUMN     "stuckAfterDays" INTEGER;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "expectedContractAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "value" DECIMAL(16,2) NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAchievement_tenantId_unlockedAt_idx" ON "UserAchievement"("tenantId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_key_level_key" ON "UserAchievement"("userId", "key", "level");

-- CreateIndex
CREATE INDEX "Task_tenantId_ruleKey_createdAt_idx" ON "Task"("tenantId", "ruleKey", "createdAt");

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Day thresholds are 1..365 when set.
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_staleAfterDays_check"
  CHECK ("staleAfterDays" IS NULL OR "staleAfterDays" BETWEEN 1 AND 365);
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_stuckAfterDays_check"
  CHECK ("stuckAfterDays" IS NULL OR "stuckAfterDays" BETWEEN 1 AND 365);
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_level_check"
  CHECK ("level" >= 1);

-- Defaults for existing open stages (same as DEFAULT_PIPELINE_STAGES).
-- Closed stages keep both rules off.
UPDATE "PipelineStage" SET
  "staleAfterDays" = CASE "name"
    WHEN 'New Lead' THEN 3
    WHEN 'Contacted' THEN 7
    WHEN 'Qualified' THEN 7
    WHEN 'Proposal' THEN 5
    WHEN 'Negotiation' THEN 5
    ELSE 7 END,
  "stuckAfterDays" = CASE "name"
    WHEN 'Contacted' THEN 14
    WHEN 'Qualified' THEN 21
    WHEN 'Proposal' THEN 14
    WHEN 'Negotiation' THEN 21
    ELSE NULL END
WHERE "isClosed" = false;
