-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'XLSX', 'PDF');

-- CreateEnum
CREATE TYPE "ExportType" AS ENUM ('LEADS', 'PROJECTS', 'DEVELOPERS', 'ACTIVITIES');

-- AlterTable
ALTER TABLE "ExportJob" ADD COLUMN "exportType" "ExportType";
ALTER TABLE "ExportJob" ADD COLUMN "format" "ExportFormat" NOT NULL DEFAULT 'CSV';
ALTER TABLE "ExportJob" ADD COLUMN "filters" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ExportJob" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ExportJob" ADD COLUMN "errorMessage" TEXT;

-- Backfill exportType for any existing rows before enforcing NOT NULL
UPDATE "ExportJob" SET "exportType" = 'LEADS' WHERE "exportType" IS NULL;

ALTER TABLE "ExportJob" ALTER COLUMN "exportType" SET NOT NULL;

-- fileAssetId is populated after export completes
ALTER TABLE "ExportJob" ALTER COLUMN "fileAssetId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ExportJob_exportType_idx" ON "ExportJob"("exportType");
