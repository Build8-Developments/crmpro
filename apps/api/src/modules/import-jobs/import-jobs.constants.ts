export const MAX_ERROR_SUMMARY_ENTRIES = 100;

/** Persist progress every N processed rows (plus final flush). */
export const PROGRESS_UPDATE_BATCH_SIZE = 25;

/** Data rows accepted per import file. */
export const MAX_IMPORT_ROWS = 10_000;

/** Rows returned by the mapping preview. */
export const IMPORT_PREVIEW_ROWS = 10;

/** Sources created on the fly from a "source" column, per job. */
export const MAX_NEW_SOURCES_PER_IMPORT = 50;
