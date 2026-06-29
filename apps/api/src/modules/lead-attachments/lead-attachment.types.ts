import { FileAssetCategory } from '@crmpro/database';

export interface LeadAttachmentSummary {
  id: string;
  category: FileAssetCategory;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: Date;
}
