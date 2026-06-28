import { FileAssetCategory } from '@prisma/client';

export interface RequestUploadResponse {
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

export interface CompleteUploadResponse {
  id: string;
  category: FileAssetCategory;
  objectKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  leadId: string | null;
  createdAt: Date;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresInSeconds: number;
}
