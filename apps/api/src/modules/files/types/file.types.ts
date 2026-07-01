import { FileAssetCategory } from '@crmpro/database';

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

export type FileUploaderSummary = {
  id: string;
  fullName: string;
  email: string;
};

export type FileLeadSummary = {
  id: string;
  fullName: string;
};

export type FileProjectSummary = {
  id: string;
  name: string;
};

export type FileAssetListItem = {
  id: string;
  category: FileAssetCategory;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  leadId: string | null;
  projectId: string | null;
  createdAt: string;
  uploadedBy: FileUploaderSummary;
  lead: FileLeadSummary | null;
  project: FileProjectSummary | null;
};
