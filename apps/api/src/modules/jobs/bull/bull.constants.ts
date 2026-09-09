export const IMPORT_QUEUE = 'import-jobs';
export const EXPORT_QUEUE = 'export-jobs';
export const CLEANUP_QUEUE = 'cleanup-jobs';
export const NOTIFICATION_QUEUE = 'notification-jobs';

export const QUEUE_NAMES = [
  IMPORT_QUEUE,
  EXPORT_QUEUE,
  CLEANUP_QUEUE,
  NOTIFICATION_QUEUE,
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export const DEFAULT_BULL_PREFIX = 'crmpro';
export const DEFAULT_IMPORT_CONCURRENCY = 3;
export const DEFAULT_EXPORT_CONCURRENCY = 2;
export const DEFAULT_CLEANUP_CONCURRENCY = 1;
export const DEFAULT_NOTIFICATION_CONCURRENCY = 5;
export const DEFAULT_JOB_ATTEMPTS = 3;
export const DEFAULT_JOB_BACKOFF_DELAY_MS = 3000;

export const BULL_CONFIG_KEYS = {
  prefix: 'bull.prefix',
  importConcurrency: 'bull.importConcurrency',
  exportConcurrency: 'bull.exportConcurrency',
  cleanupConcurrency: 'bull.cleanupConcurrency',
  notificationConcurrency: 'bull.notificationConcurrency',
  jobAttempts: 'bull.jobAttempts',
  jobBackoffDelayMs: 'bull.jobBackoffDelayMs',
} as const;

export interface BullConfig {
  prefix: string;
  importConcurrency: number;
  exportConcurrency: number;
  cleanupConcurrency: number;
  notificationConcurrency: number;
  jobAttempts: number;
  jobBackoffDelayMs: number;
}

export const REDIS_CONFIG_KEYS = {
  host: 'redis.host',
  port: 'redis.port',
  password: 'redis.password',
} as const;
