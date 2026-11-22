-- AlterTable
ALTER TABLE "FileAsset" ADD COLUMN     "interactionId" UUID;

-- CreateIndex
CREATE INDEX "FileAsset_interactionId_idx" ON "FileAsset"("interactionId");

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

