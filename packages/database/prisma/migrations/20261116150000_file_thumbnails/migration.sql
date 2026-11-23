-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "thumbnailObjectKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_thumbnailObjectKey_key" ON "FileAsset"("thumbnailObjectKey");

