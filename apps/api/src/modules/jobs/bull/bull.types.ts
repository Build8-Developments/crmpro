import { CleanupJobName } from '../../cleanup/cleanup.constants';

export interface BackgroundJobPayload {
  jobId: string;
  requestId?: string;
}

export interface CleanupJobPayload {
  jobName: CleanupJobName;
  requestId?: string;
}

export type QueueJobPayload = BackgroundJobPayload | CleanupJobPayload;

export type WorkerStatus = 'running' | 'stopped';

export interface WorkerHealthMap {
  import: WorkerStatus;
  export: WorkerStatus;
  cleanup: WorkerStatus;
  notification: WorkerStatus;
  automation: WorkerStatus;
  taskReminder: WorkerStatus;
}

export interface JobsHealthStatus {
  redis: 'up' | 'down';
  queues: 'healthy' | 'unhealthy';
  workers: WorkerHealthMap;
  cleanup: {
    lastRun: string | null;
    status: 'healthy' | 'degraded';
  };
}
