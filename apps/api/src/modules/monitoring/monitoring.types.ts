export type HealthStatus = 'up' | 'down';
export type QueueHealthStatus = 'healthy' | 'unhealthy';
export type WorkerStatus = 'running' | 'stopped';

export interface GlobalHealthData {
  api: HealthStatus;
  database: HealthStatus;
  redis: HealthStatus;
  storage: HealthStatus;
  queues: QueueHealthStatus;
  cleanupScheduler: HealthStatus;
  version: string;
  environment: string;
  uptimeSeconds: number;
}

export interface WorkerHealthMap {
  import: WorkerStatus;
  export: WorkerStatus;
  cleanup: WorkerStatus;
  notification: WorkerStatus;
  automation: WorkerStatus;
  taskReminder: WorkerStatus;
}

export interface JobsHealthData {
  redis: HealthStatus;
  queues: QueueHealthStatus;
  workers: WorkerHealthMap;
  cleanup: {
    lastRun: string | null;
    status: 'healthy' | 'degraded';
  };
}

export interface QueueMetricsSnapshot {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface MetricsData {
  http: {
    totalRequests: number;
    averageResponseTimeMs: number;
    p95ResponseTimeMs: number;
    errorRate: number;
  };
  queues: {
    import: QueueMetricsSnapshot;
    export: QueueMetricsSnapshot;
    cleanup: QueueMetricsSnapshot;
    notification: QueueMetricsSnapshot;
    automation: QueueMetricsSnapshot;
    task: QueueMetricsSnapshot;
  };
  tasks: {
    created: number;
    completed: number;
    overdue: number;
    remindersSent: number;
    averageCompletionTimeHours: number;
  };
  notifications: {
    created: number;
    deliveryFailures: number;
    averageDeliveryTimeMs: number;
    unreadCount: number | null;
  };
  automation: {
    executions: number;
    successes: number;
    failures: number;
    skipped: number;
    averageExecutionTimeMs: number;
    successRate: number;
  };
  workers: WorkerHealthMap;
}
