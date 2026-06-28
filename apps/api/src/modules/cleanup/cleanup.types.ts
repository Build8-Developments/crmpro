import { CleanupJobName } from './cleanup.constants';

export interface CleanupTaskResult {
  jobName: CleanupJobName;
  deleted: number;
  updated: number;
  durationMs: number;
  error?: string;
}

export interface CleanupHealthEntry {
  lastRun: string | null;
  status: 'healthy' | 'degraded';
}

export type CleanupHealthStatus = Record<CleanupJobName, CleanupHealthEntry>;

export interface CleanupConfig {
  uploadIntentTtlMinutes: number;
  importJobTimeoutMinutes: number;
  exportJobTimeoutMinutes: number;
  sessionRetentionDays: number;
  batchSize: number;
  schedules: {
    uploadIntentsIntervalMs: number;
    staleJobsIntervalMs: number;
    sessionsIntervalMs: number;
    orphanS3Cron: string;
  };
}
