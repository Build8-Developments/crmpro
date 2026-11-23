import { ImportDuplicatePolicy, JobStatus } from '@crmpro/database';
import type { StoredLeadScope } from '../../../common/auth';
import type {
  CustomFieldTarget,
  ImportField,
  ImportMapping,
} from '../mapping/import-fields';
import type { ImportFileType } from '../parsing/import-table.reader';

export type ImportJobErrorKind = 'error' | 'duplicate';

export interface ImportJobErrorEntry {
  /** Spreadsheet line (header = 1); 0 for whole-file errors. */
  row: number;
  reason: string;
  /** Missing on jobs created before duplicates were reported separately. */
  kind?: ImportJobErrorKind;
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

/** Validated defaults stored on the job and applied to every row. */
export interface ImportDefaults {
  sourceId?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  projectId?: string;
  assignedUserId?: string;
}

/** Shape of ImportJob.options (never returned to clients as-is). */
export interface StoredImportJobOptions {
  version: number;
  /** null: match columns automatically by header (legacy / API clients). */
  mapping: ImportMapping | null;
  defaults: ImportDefaults;
  /** The importer held lead.assign: assignee column/default are honoured. */
  canAssign: boolean;
  /** The importer's lead scope: assignees must be inside it. */
  scope: StoredLeadScope;
}

/** Public part of the job options. */
export interface ImportJobOptionsResponse {
  mapping: ImportMapping | null;
  defaults: ImportDefaults;
}

export interface ImportJobResponse {
  id: string;
  status: JobStatus;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  /** Rows skipped because the phone already belongs to a lead. */
  skippedRows: number;
  duplicatePolicy: ImportDuplicatePolicy;
  options: ImportJobOptionsResponse | null;
  errorSummary: ImportJobErrorEntry[] | null;
  fileAsset: ImportJobFileSummary;
  createdBy: ImportJobCreatorSummary;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface ImportFieldDescriptor {
  /** A lead field, or `custom:<key>` for a tenant custom field. */
  key: ImportField | CustomFieldTarget;
  label: string;
  required: boolean;
  /** A tenant custom field (shown in its own group). */
  custom: boolean;
}

export interface ImportPreviewResponse {
  fileAssetId: string;
  fileName: string;
  fileType: ImportFileType;
  headers: string[];
  /** First rows, one value per header (same order). */
  sampleRows: string[][];
  /** Non-blank data rows in the file. */
  totalRows: number;
  /** Header → suggested field (null = not imported). */
  suggestedMapping: ImportMapping;
  /** Every field a column can be mapped to, in display order. */
  fields: ImportFieldDescriptor[];
}
