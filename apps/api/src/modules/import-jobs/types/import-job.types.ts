import { ImportDuplicatePolicy, JobStatus } from '@crmpro/database';
import type { StoredLeadScope } from '../../leads/scope/lead-scope.types';
import type { ImportMapping } from '../mapping/import-fields';
import type { ImportFileKind } from '../parsing/import-table.reader';

export interface ImportJobErrorEntry {
  row: number;
  reason: string;
  /** `duplicate` rows were skipped by the duplicate policy, not failed. */
  kind?: 'error' | 'duplicate';
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

export interface ImportJobResponse {
  id: string;
  status: JobStatus;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  duplicatePolicy: ImportDuplicatePolicy;
  errorSummary: ImportJobErrorEntry[] | null;
  fileAsset: ImportJobFileSummary;
  createdBy: ImportJobCreatorSummary;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface ImportDefaults {
  sourceId?: string;
  pipelineId?: string;
  stageId?: string;
  projectId?: string;
  assignedUserId?: string;
}

/** Persisted on `ImportJob.options`. */
export interface ImportJobOptions {
  /** null: match columns by header name when the job runs. */
  mapping: ImportMapping | null;
  defaults: ImportDefaults;
  /** Creator's lead scope at creation: assignees must stay inside it. */
  scope: StoredLeadScope;
}

export interface ImportFieldDescriptor {
  key: string;
  label: string;
  required: boolean;
  kind: 'core' | 'custom';
  type?: string;
  options?: string[] | null;
}

export interface ImportPreviewResponse {
  fileAssetId: string;
  fileName: string;
  fileKind: ImportFileKind;
  headers: string[];
  sampleRows: string[][];
  totalRows: number;
  suggestedMapping: ImportMapping;
  fields: ImportFieldDescriptor[];
}
