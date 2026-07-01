/**
 * Dashboard / analytics types from CRM API `analytics.types.ts`.
 */

export interface AnalyticsDateParams {
  from?: string;
  to?: string;
}

export interface DashboardOverviewData {
  totalLeads: number;
  openLeads: number;
  wonLeads: number;
  lostLeads: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  conversionRate: number;
  avgResponseTimeHours: number | null;
  avgLeadAgeDays: number | null;
  activePipelines: number;
  activeProjects: number;
  developers: number;
  importsToday: number;
  exportsToday: number;
}
