export type HealthStatus = 'up' | 'down';
export type QueueHealthStatus = 'healthy' | 'unhealthy';
export type WorkerStatus = 'running' | 'stopped';

export interface WorkerHealthMap {
  import: WorkerStatus;
  export: WorkerStatus;
  cleanup: WorkerStatus;
  notification: WorkerStatus;
}

export interface JobsHealthSnapshot {
  redis: HealthStatus;
  queues: QueueHealthStatus;
  workers: WorkerHealthMap;
}

export interface CleanupHealthSummary {
  lastRun: string | null;
  status: 'healthy' | 'degraded';
}

export interface NotificationMetricsSnapshot {
  created: number;
  deliveryFailures: number;
  averageDeliveryTimeMs: number;
}

export interface JobsHealthProvider {
  getHealth(): Promise<JobsHealthSnapshot>;
}

export interface CleanupHealthProvider {
  getJobsHealthSummary(): CleanupHealthSummary;
}

export interface CleanupSchedulerHealthContributor {
  getSchedulerStatus(): HealthStatus;
}

export interface NotificationMetricsProvider {
  getSnapshot(): NotificationMetricsSnapshot;
}
