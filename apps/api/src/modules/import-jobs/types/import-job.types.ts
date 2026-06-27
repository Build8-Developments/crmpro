import { JobStatus } from '@prisma/client';

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

export interface ImportJobResponse {
  id: string;
  status: JobStatus;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  errorSummary: ImportJobErrorEntry[] | null;
  fileAsset: ImportJobFileSummary;
  createdBy: ImportJobCreatorSummary;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface LeadCsvRow {
  fullName?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;
  sourceName?: string;
  assignedUserEmail?: string;
}

export interface ParsedLeadCsvRow extends LeadCsvRow {
  __line: number;
}
