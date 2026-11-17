import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type FileAssetCategory =
  | "AVATAR"
  | "LEAD_ATTACHMENT"
  | "PROJECT_BROCHURE"
  | "IMPORT_FILE"
  | "EXPORT_FILE"
  | "TENANT_LOGO"
  | "OTHER";

export type FileCategoryFilter = FileAssetCategory | "all";

export interface FileUploader {
  id: string;
  fullName: string;
  email: string;
}

export interface FileLeadSummary {
  id: string;
  fullName: string;
}

export interface FileProjectSummary {
  id: string;
  name: string;
}

export interface FileAsset {
  id: string;
  category: FileAssetCategory;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  leadId: string | null;
  projectId: string | null;
  createdAt: string;
  uploadedBy: FileUploader;
  lead: FileLeadSummary | null;
  project: FileProjectSummary | null;
}

export interface RequestUploadInput {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface RequestUploadResponse {
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

export interface CompleteUploadInput {
  objectKey: string;
  category:
    | "OTHER"
    | "IMPORT_FILE"
    | "LEAD_ATTACHMENT"
    | "TENANT_LOGO"
    | "PROJECT_BROCHURE";
  leadId?: string;
  projectId?: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresInSeconds: number;
}

export type FilesListParams = ListQueryParams & {
  category?: FileAssetCategory;
  sortBy?: "createdAt" | "originalFilename" | "sizeBytes";
};

export type FilesListResponse = PaginatedResponse<FileAsset>;

export type FilesSortField = "createdAt" | "originalFilename" | "sizeBytes";
