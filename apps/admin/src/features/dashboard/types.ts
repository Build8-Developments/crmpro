/**
 * Platform analytics dashboard types from admin-api
 * `platform-analytics.types.ts`.
 */

export interface PlatformTenantStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
  cancelled: number;
}

export interface PlatformUserStats {
  total: number;
  active: number;
}

export interface PlatformLeadStats {
  total: number;
}

export interface PlatformContractStats {
  total: number;
  active: number;
  draft: number;
}

export interface PlatformPlanStats {
  total: number;
  active: number;
}

export interface PlatformImportActivity {
  last24h: number;
  last7d: number;
  byStatus: {
    PENDING: number;
    PROCESSING: number;
    COMPLETED: number;
    FAILED: number;
    PARTIAL_SUCCESS: number;
  };
}

export interface PlatformSystemHealth {
  status: "ok" | "degraded";
  database: "up" | "down";
  checkedAt: string;
}

export interface PlatformRecentAuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export type PlatformAttentionSeverity = "critical" | "warning" | "info";

export interface PlatformAttentionItem {
  id: string;
  severity: PlatformAttentionSeverity;
  title: string;
  description: string;
  href: string;
  count: number;
}

export interface PlatformAttentionTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export interface PlatformAttentionContract {
  id: string;
  contractName: string | null;
  status: string;
  planName: string;
  agreedPrice: number;
  currency: string;
}

export interface PlatformUsageAtRiskTenant {
  id: string;
  name: string;
  slug: string;
  metric: "users" | "leads" | "projects" | "storage";
  used: number;
  limit: number;
  percent: number;
}

export interface PlatformFailedImportItem {
  id: string;
  status: string;
  failedRows: number;
  totalRows: number;
  createdAt: string;
  completedAt: string | null;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface PlatformMrrByCurrency {
  currency: string;
  mrr: number;
  contractCount: number;
}

export interface PlatformRevenueStats {
  mrrByCurrency: PlatformMrrByCurrency[];
  activeContractCount: number;
}

export interface PlatformAttentionQueue {
  items: PlatformAttentionItem[];
  suspendedTenants: PlatformAttentionTenant[];
  trialTenants: PlatformAttentionTenant[];
  draftContracts: PlatformAttentionContract[];
  usageAtRiskTenants: PlatformUsageAtRiskTenant[];
  failedImports: PlatformFailedImportItem[];
}

export interface PlatformAnalyticsDashboardData {
  tenants: PlatformTenantStats;
  users: PlatformUserStats;
  leads: PlatformLeadStats;
  contracts: PlatformContractStats;
  plans: PlatformPlanStats;
  revenue: PlatformRevenueStats;
  importActivity: PlatformImportActivity;
  systemHealth: PlatformSystemHealth;
  recentAudit: PlatformRecentAuditItem[];
  attention: PlatformAttentionQueue;
}
