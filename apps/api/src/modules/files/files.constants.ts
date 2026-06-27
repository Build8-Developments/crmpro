export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
export const UPLOAD_INTENT_TTL_SECONDS = 900; // 15 minutes
export const DOWNLOAD_URL_EXPIRY_SECONDS = 3600; // 1 hour

/** Phase 1 allowed categories for client uploads. */
export const PHASE1_UPLOAD_CATEGORIES = [
  'LEAD_ATTACHMENT',
  'IMPORT_FILE',
  'OTHER',
] as const;
