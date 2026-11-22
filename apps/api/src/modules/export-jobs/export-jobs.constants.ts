/** Signed download URL lifetime for completed export files. */
export const EXPORT_DOWNLOAD_URL_EXPIRY_SECONDS = 600; // 10 minutes

/** Persist progress every N processed rows (plus final flush). */
export const EXPORT_PROGRESS_BATCH_SIZE = 500;

export const EXPORT_CSV_MIME_TYPE = 'text/csv';
export const EXPORT_XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
