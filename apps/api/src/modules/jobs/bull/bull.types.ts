export interface BackgroundJobPayload {
  jobId: string;
}

export interface CleanupJobPayload {
  type: string;
}

export type QueueJobPayload = BackgroundJobPayload | CleanupJobPayload;

export interface JobsHealthStatus {
  redis: 'up' | 'down';
  queues: 'healthy' | 'unhealthy';
  workers: 'running' | 'stopped';
}
