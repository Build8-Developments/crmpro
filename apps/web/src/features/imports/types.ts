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
  /** "duplicate" rows were skipped by the duplicate policy. */
  kind?: "error" | "duplicate";
}

export type ImportDuplicatePolicy = "SKIP" | "CREATE";

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
  skippedRows: number;
  duplicatePolicy: ImportDuplicatePolicy;
  errorSummary: ImportJobErrorEntry[] | null;
  fileAsset: ImportJobFileSummary;
  createdBy: ImportJobCreatorSummary;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type ImportJobsListParams = ListQueryParams;

export type ImportJobsListResponse = PaginatedResponse<ImportJob>;

/** Lead field → zero-based column index (`cf:<key>` for custom fields). */
export type ImportMapping = Record<string, number>;

export interface ImportDefaults {
  sourceId?: string;
  pipelineId?: string;
  stageId?: string;
  projectId?: string;
  assignedUserId?: string;
}

export interface CreateLeadImportJobInput {
  fileAssetId: string;
  mapping?: ImportMapping;
  defaults?: ImportDefaults;
  duplicatePolicy?: ImportDuplicatePolicy;
}

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  kind: "core" | "custom";
  type?: string;
  options?: string[] | null;
}

export interface ImportPreview {
  fileAssetId: string;
  fileName: string;
  fileKind: "csv" | "xlsx";
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  suggestedMapping: ImportMapping;
  fields: ImportField[];
}
