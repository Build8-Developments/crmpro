/** Signed download URL lifetime for completed export files. */
export const EXPORT_DOWNLOAD_URL_EXPIRY_SECONDS = 600; // 10 minutes

/** Persist progress every N processed rows (plus final flush). */
export const EXPORT_PROGRESS_BATCH_SIZE = 500;

export const EXPORT_CSV_MIME_TYPE = 'text/csv';
export const EXPORT_XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const LEAD_EXPORT_CSV_HEADERS = [
  'Lead Name',
  'Primary Phone',
  'Secondary Phone',
  'Email',
  'Lead Source',
  'Pipeline',
  'Stage',
  'Assigned User',
  'Interested Projects',
  'Status',
  'Created At',
  'Budget From',
  'Budget To',
] as const;

/** LeadExportRow key for each fixed header, in order. */
export const LEAD_EXPORT_COLUMN_KEYS = [
  'leadName',
  'primaryPhone',
  'secondaryPhone',
  'email',
  'leadSource',
  'pipeline',
  'stage',
  'assignedUser',
  'interestedProjects',
  'status',
  'createdAt',
  'budgetMin',
  'budgetMax',
] as const;
