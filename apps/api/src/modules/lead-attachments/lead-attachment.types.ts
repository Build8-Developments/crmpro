import { FileAssetCategory } from '@prisma/client';

export interface LeadAttachmentSummary {
  id: string;
  category: FileAssetCategory;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: Date;
}
