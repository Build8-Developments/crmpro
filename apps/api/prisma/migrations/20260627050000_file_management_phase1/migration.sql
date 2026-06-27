-- FileAssetCategory: rename values for platform file taxonomy
CREATE TYPE "FileAssetCategory_new" AS ENUM (
  'AVATAR',
  'LEAD_ATTACHMENT',
  'PROJECT_BROCHURE',
  'IMPORT_FILE',
  'EXPORT_FILE',
  'OTHER'
);

ALTER TABLE "FileAsset"
  ALTER COLUMN "category" TYPE "FileAssetCategory_new"
  USING (
    CASE "category"::text
      WHEN 'ATTACHMENT' THEN 'LEAD_ATTACHMENT'
      WHEN 'BROCHURE' THEN 'PROJECT_BROCHURE'
      WHEN 'IMPORT' THEN 'IMPORT_FILE'
      WHEN 'EXPORT' THEN 'EXPORT_FILE'
      ELSE "category"::text
    END
  )::"FileAssetCategory_new";

DROP TYPE "FileAssetCategory";
ALTER TYPE "FileAssetCategory_new" RENAME TO "FileAssetCategory";

-- Lead activity events for file workflow
ALTER TYPE "LeadActivityEventType" ADD VALUE 'FILE_ATTACHED';
ALTER TYPE "LeadActivityEventType" ADD VALUE 'FILE_DELETED';

-- Pending upload intents (request-upload → complete-upload)
CREATE TABLE "FileUploadIntent" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "objectKey" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FileUploadIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FileUploadIntent_objectKey_key" ON "FileUploadIntent"("objectKey");
CREATE INDEX "FileUploadIntent_tenantId_userId_idx" ON "FileUploadIntent"("tenantId", "userId");
CREATE INDEX "FileUploadIntent_expiresAt_idx" ON "FileUploadIntent"("expiresAt");
