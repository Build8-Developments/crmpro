export const REQUIRED_CSV_HEADERS = ['fullName', 'primaryPhone'] as const;

export const OPTIONAL_CSV_HEADERS = [
  'secondaryPhone',
  'email',
  'sourceName',
  'assignedUserEmail',
] as const;

export const ALLOWED_CSV_HEADERS = [
  ...REQUIRED_CSV_HEADERS,
  ...OPTIONAL_CSV_HEADERS,
] as const;

export const MAX_ERROR_SUMMARY_ENTRIES = 100;

export type LeadCsvHeader = (typeof ALLOWED_CSV_HEADERS)[number];
