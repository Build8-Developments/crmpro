export interface UsageMetric {
  used: number;
  limit: number | null;
}

export interface StorageUsageMetric {
  usedBytes: number;
  limitBytes: number | null;
}

export interface TenantUsageResponse {
  users: UsageMetric;
  leads: UsageMetric;
  projects: UsageMetric;
  storage: StorageUsageMetric;
}
