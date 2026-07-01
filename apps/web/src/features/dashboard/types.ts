/**
 * Dashboard / analytics types from CRM API `analytics.types.ts`.
 */

export type DashboardRange = "7d" | "30d" | "90d";

export interface DashboardQueryParams {
  range?: DashboardRange;
}

/** @deprecated Use DashboardQueryParams with mega endpoint */
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
  staleLeads: number;
  unassignedLeads: number;
}

export interface PipelineStageSnapshot {
  stageId: string;
  name: string;
  count: number;
  avgDaysInStage: number | null;
}

export interface PipelineAnalyticsData {
  pipelineId: string;
  pipelineName: string;
  stages: PipelineStageSnapshot[];
}

export interface TrendCountPoint {
  date: string;
  count: number;
}

export interface TrendAnalyticsData {
  leadCreation: TrendCountPoint[];
  leadClosing: TrendCountPoint[];
}

export interface TeamPerformerSnapshot {
  userId: string;
  name: string;
  assignedLeads: number;
  wonLeads: number;
  conversionRate: number;
}

export interface TeamAnalyticsData {
  topPerformers: TeamPerformerSnapshot[];
}

export interface LeadSourceAnalytics {
  sourceId: string | null;
  sourceName: string;
  count: number;
  percentage: number;
  won: number;
  conversionRate: number;
}

export interface ProjectPerformanceAnalytics {
  projectId: string;
  projectName: string;
  developer: string;
  interestedLeads: number;
}

export interface DeveloperPerformanceAnalytics {
  developerId: string;
  developerName: string;
  projects: number;
  interestedLeads: number;
}

export interface LeadStatusDistribution {
  open: number;
  won: number;
  lost: number;
  archived: number;
}

export interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

/** Permission-aware dashboard payload — unauthorized sections are omitted. */
export interface AnalyticsDashboardData {
  overview?: DashboardOverviewData;
  pipeline?: PipelineAnalyticsData;
  trends?: TrendAnalyticsData;
  team?: TeamAnalyticsData;
  activity?: ActivityFeedItem[];
  sources?: LeadSourceAnalytics[];
  projects?: ProjectPerformanceAnalytics[];
  developers?: DeveloperPerformanceAnalytics[];
  status?: LeadStatusDistribution;
}
