-- DropForeignKey
ALTER TABLE "ExportJob" DROP CONSTRAINT "ExportJob_fileAssetId_fkey";

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
