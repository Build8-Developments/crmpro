export const REQUIRED_CSV_HEADERS = ['fullName', 'primaryPhone'] as const;

/** Recognized optional columns — extra columns in the CSV are ignored. */
export const OPTIONAL_CSV_HEADERS = [
  'secondaryPhone',
  'email',
  'sourceName',
  'assignedUserEmail',
] as const;

export const MAX_ERROR_SUMMARY_ENTRIES = 100;

/** Persist progress every N processed rows (plus final flush). */
export const PROGRESS_UPDATE_BATCH_SIZE = 25;

export type LeadCsvHeader =
  | (typeof REQUIRED_CSV_HEADERS)[number]
  | (typeof OPTIONAL_CSV_HEADERS)[number];
