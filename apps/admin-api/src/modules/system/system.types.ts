export type HealthStatus = 'up' | 'down' | 'not_configured';
export type QueueHealthStatus = 'healthy' | 'unhealthy' | 'not_configured';
export type WorkerStatus = 'running' | 'stopped' | 'unknown';

export interface JobStatusCounts {
  PENDING: number;
  PROCESSING: number;
  COMPLETED: number;
  FAILED: number;
  PARTIAL_SUCCESS: number;
}

export interface QueueMetricsSnapshot {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface WorkerHealthMap {
  import: WorkerStatus;
  export: WorkerStatus;
  cleanup: WorkerStatus;
  notification: WorkerStatus;
}

export interface TenantApiHealth {
  status: HealthStatus;
  probeLatencyMs: number | null;
  database: HealthStatus | null;
  redis: HealthStatus | null;
  storage: HealthStatus | null;
  queues: QueueHealthStatus | null;
  cleanupScheduler: HealthStatus | null;
  version: string | null;
  environment: string | null;
  uptimeSeconds: number | null;
}

export interface SystemJobsSnapshot {
  imports: JobStatusCounts;
  exports: JobStatusCounts;
  stuckImports: number;
  stuckExports: number;
  stuckTimeoutMinutes: number;
}

export interface SystemQueueSnapshot {
  status: QueueHealthStatus;
  import: QueueMetricsSnapshot;
  export: QueueMetricsSnapshot;
  cleanup: QueueMetricsSnapshot;
  notification: QueueMetricsSnapshot;
}

export interface SystemHttpMetrics {
  totalRequests: number;
  averageResponseTimeMs: number;
  p95ResponseTimeMs: number;
  errorRate: number;
}

export interface SystemNotificationMetrics {
  created: number;
  deliveryFailures: number;
  averageDeliveryTimeMs: number;
  unreadCount: number | null;
}

export interface SystemHealthData {
  status: 'ok' | 'degraded';
  checkedAt: string;
  /** @deprecated Prefer adminApi.status — kept for older clients */
  api: 'up';
  database: HealthStatus;
  redis: HealthStatus;
  version: string;
  environment: string;
  uptimeSeconds: number;
  adminApi: {
    status: 'up';
    database: HealthStatus;
    redis: HealthStatus;
    version: string;
    environment: string;
    uptimeSeconds: number;
  };
  tenantApi: TenantApiHealth;
  queues: SystemQueueSnapshot;
  workers: WorkerHealthMap;
  cleanup: {
    lastRun: string | null;
    status: 'healthy' | 'degraded' | 'unknown';
  };
  jobs: SystemJobsSnapshot;
  metrics: {
    available: boolean;
    http: SystemHttpMetrics | null;
    notifications: SystemNotificationMetrics | null;
  };
}
