import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type ImportJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL_SUCCESS";

export type ImportJobErrorKind = "error" | "duplicate";

export interface ImportJobErrorEntry {
  /** Spreadsheet line (header = 1); 0 for whole-file errors. */
  row: number;
  reason: string;
  /** Missing on older jobs (always an error then). */
  kind?: ImportJobErrorKind;
}

export type ImportDuplicatePolicy = "SKIP" | "CREATE";

export type ImportFieldKey =
  | "fullName"
  | "primaryPhone"
  | "secondaryPhone"
  | "email"
  | "source"
  | "project"
  | "notes"
  | "budget"
  | "budgetMin"
  | "budgetMax"
  | "occupation"
  | "residenceArea"
  | "paymentPreference"
  | "contactChannelPreference"
  | "contactTimePreference"
  | "purchasePurpose"
  | "assignee"
  /** A tenant custom field: `custom:<definition key>`. */
  | `custom:${string}`;

/** File header → lead field (null = not imported). */
export type ImportMapping = Record<string, ImportFieldKey | null>;

export interface ImportDefaults {
  sourceId?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  projectId?: string;
  assignedUserId?: string;
}

export interface ImportJobOptions {
  mapping: ImportMapping | null;
  defaults: ImportDefaults;
}

export interface ImportFieldDescriptor {
  key: ImportFieldKey;
  label: string;
  required: boolean;
  /** A tenant custom field (listed in its own group). */
  custom: boolean;
}

export interface ImportPreview {
  fileAssetId: string;
  fileName: string;
  fileType: "csv" | "xlsx";
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  suggestedMapping: ImportMapping;
  fields: ImportFieldDescriptor[];
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
  /** Rows skipped because the phone already belongs to a lead. */
  skippedRows: number;
  duplicatePolicy: ImportDuplicatePolicy;
  options: ImportJobOptions | null;
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
  mapping?: ImportMapping;
  defaults?: ImportDefaults;
  duplicatePolicy?: ImportDuplicatePolicy;
}
