import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type ImportJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL_SUCCESS";

export interface ImportJobErrorEntry {
  row: number;
  reason: string;
}

export interface ImportJobFileSummary {
  id: string;
  originalFilename: string;
}

export interface ImportJobCreatorSummary {
  id: string;
  name: string;
  email: string;
}

export interface ImportJob {
  id: string;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errorSummary: ImportJobErrorEntry[] | null;
  fileAsset: ImportJobFileSummary;
  createdBy: ImportJobCreatorSummary;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type ImportJobsListParams = ListQueryParams;

export type ImportJobsListResponse = PaginatedResponse<ImportJob>;

export interface CreateLeadImportJobInput {
  fileAssetId: string;
}
