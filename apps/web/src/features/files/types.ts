import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type FileAssetCategory =
  | "AVATAR"
  | "LEAD_ATTACHMENT"
  | "PROJECT_BROCHURE"
  | "IMPORT_FILE"
  | "EXPORT_FILE"
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
  folderId: string | null;
  createdAt: string;
  uploadedBy: FileUploader;
  lead: FileLeadSummary | null;
  project: FileProjectSummary | null;
  /** Signed thumbnail URL for images (expires after ~1h). */
  previewUrl?: string | null;
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
  category: "OTHER" | "IMPORT_FILE";
  leadId?: string;
  folderId?: string;
}

export interface DownloadUrlResponse {
  downloadUrl: string;
  expiresInSeconds: number;
}

export type FilesListParams = ListQueryParams & {
  category?: FileAssetCategory;
  /** Folder id or "root". */
  folderId?: string;
  sortBy?: "createdAt" | "originalFilename" | "sizeBytes";
};

export type FilesListResponse = PaginatedResponse<FileAsset>;

export type FilesSortField = "createdAt" | "originalFilename" | "sizeBytes";

/** GET /files/folders */
export interface FileFolder {
  id: string;
  parentId: string | null;
  name: string;
  isPrivate: boolean;
  /** Private (or inside a private folder) and not unlocked this session. */
  isLocked: boolean;
  fileCount: number | null;
  createdAt: string;
  createdBy: { id: string; fullName: string };
  canManage: boolean;
}

export type FileKind =
  | "image"
  | "pdf"
  | "spreadsheet"
  | "document"
  | "video"
  | "audio"
  | "archive"
  | "other";

/** GET /files/stats — scope: folderId | "root" | category | whole library. */
export interface FilesStats {
  totalFiles: number;
  totalBytes: number;
  byKind: { kind: FileKind; count: number; bytes: number }[];
  topUploaders: {
    user: { id: string; fullName: string };
    count: number;
    bytes: number;
  }[];
  storage: { usedBytes: number; limitBytes: number | null };
}

export interface FilesStatsParams {
  folderId?: string;
  category?: FileAssetCategory;
}

export interface CreateFolderInput {
  name: string;
  parentId?: string;
  password?: string;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
}

export interface SetFolderPasswordInput {
  currentPassword?: string;
  newPassword: string | null;
}

export type FilePreviewKind = "image" | "pdf" | "video" | "audio" | "text";

/** GET /files/:id/preview-url — `kind: null` means download only. */
export interface FilePreview {
  previewUrl: string | null;
  kind: FilePreviewKind | null;
  mimeType: string;
  expiresInSeconds: number;
}
