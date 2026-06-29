export enum CleanupJobName {
  FILE_UPLOAD_INTENTS = 'FILE_UPLOAD_INTENTS',
  STALE_IMPORT_JOBS = 'STALE_IMPORT_JOBS',
  STALE_EXPORT_JOBS = 'STALE_EXPORT_JOBS',
  EXPIRED_SESSIONS = 'EXPIRED_SESSIONS',
  ORPHAN_S3_OBJECTS = 'ORPHAN_S3_OBJECTS',
}

export const CLEANUP_JOB_NAMES = Object.values(CleanupJobName);

export const STALE_IMPORT_JOB_RECLAIMED =
  'Stale import job reclaimed for retry by cleanup worker.';
export const STALE_EXPORT_JOB_RECLAIMED =
  'Stale export job reclaimed for retry by cleanup worker.';

export const S3_TENANT_PREFIX = 'tenant/';

export const CLEANUP_CONFIG_KEYS = {
  uploadIntentTtlMinutes: 'cleanup.uploadIntentTtlMinutes',
  importJobTimeoutMinutes: 'cleanup.importJobTimeoutMinutes',
  exportJobTimeoutMinutes: 'cleanup.exportJobTimeoutMinutes',
  sessionRetentionDays: 'cleanup.sessionRetentionDays',
  batchSize: 'cleanup.batchSize',
  uploadIntentsIntervalMs: 'cleanup.schedules.uploadIntentsIntervalMs',
  staleJobsIntervalMs: 'cleanup.schedules.staleJobsIntervalMs',
  sessionsIntervalMs: 'cleanup.schedules.sessionsIntervalMs',
  orphanS3Cron: 'cleanup.schedules.orphanS3Cron',
} as const;

export const DEFAULT_UPLOAD_INTENT_TTL_MINUTES = 60;
export const DEFAULT_IMPORT_JOB_TIMEOUT_MINUTES = 15;
export const DEFAULT_EXPORT_JOB_TIMEOUT_MINUTES = 15;
export const DEFAULT_SESSION_RETENTION_DAYS = 30;
export const DEFAULT_CLEANUP_BATCH_SIZE = 500;
export const DEFAULT_UPLOAD_INTENTS_INTERVAL_MS = 60 * 60 * 1000;
export const DEFAULT_STALE_JOBS_INTERVAL_MS = 15 * 60 * 1000;
export const DEFAULT_SESSIONS_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_ORPHAN_S3_CRON = '0 3 * * *';
