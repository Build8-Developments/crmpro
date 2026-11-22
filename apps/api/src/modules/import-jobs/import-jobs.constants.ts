export const MAX_ERROR_SUMMARY_ENTRIES = 100;

/** Duplicate rows listed in the error summary (separate from real errors). */
export const MAX_DUPLICATE_SUMMARY_ENTRIES = 100;

/** Persist progress every N processed rows (plus final flush). */
export const PROGRESS_UPDATE_BATCH_SIZE = 25;

/** Data rows accepted per import file (CSV and XLSX). */
export const MAX_IMPORT_ROWS = 20_000;

/** Columns accepted in an import file's header row. */
export const MAX_IMPORT_COLUMNS = 200;

/** Rows returned by the mapping preview. */
export const IMPORT_PREVIEW_ROWS = 5;

/** Version of the shape stored in ImportJob.options. */
export const IMPORT_OPTIONS_VERSION = 1;
