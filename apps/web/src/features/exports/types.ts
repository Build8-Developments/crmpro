import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type ExportJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL_SUCCESS";

export type ExportFormat = "CSV" | "XLSX" | "PDF";

export type ExportType = "LEADS" | "PROJECTS" | "DEVELOPERS" | "ACTIVITIES";

export interface ExportJobFileSummary {
  id: string;
  originalFilename: string;
}

export interface ExportJobCreatorSummary {
  id: string;
  name: string;
  email: string;
}

export interface ExportJobDownloadSummary {
  downloadUrl: string;
  expiresInSeconds: number;
}

export interface ExportJobFilters {
  pipelineId?: string;
  stageId?: string;
  assignedUserId?: string;
  sourceId?: string;
  status?: "OPEN" | "ARCHIVED";
  search?: string;
}

export interface ExportJob {
  id: string;
  exportType: ExportType;
  format: ExportFormat;
  status: ExportJobStatus;
  progress: number;
  rowCount: number | null;
  filters: ExportJobFilters;
  errorMessage: string | null;
  fileAssetId: string | null;
  fileAsset: ExportJobFileSummary | null;
  download: ExportJobDownloadSummary | null;
  createdBy: ExportJobCreatorSummary;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateLeadExportInput {
  format?: ExportFormat;
  filters?: ExportJobFilters;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateExportJobResponse {
  id: string;
  status: ExportJobStatus;
}

export type ExportJobsListParams = ListQueryParams & {
  status?: ExportJobStatus;
  exportType?: ExportType;
};

export type ExportJobsListResponse = PaginatedResponse<ExportJob>;
