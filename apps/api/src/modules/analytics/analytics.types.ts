import { RecentActivityType } from './analytics.constants';

export interface AnalyticsDateRange {
  from?: Date;
  to?: Date;
}

export type DashboardOverviewBaseData = Omit<
  DashboardOverviewData,
  'staleLeads' | 'unassignedLeads'
>;

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

export interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export type AnalyticsDashboardData = {
  overview?: DashboardOverviewData;
  pipeline?: PipelineAnalyticsData;
  trends?: TrendAnalyticsData;
  team?: TeamAnalyticsData;
  activity?: ActivityFeedItem[];
};

export interface PipelineStageAnalytics {
  stageId: string;
  stageName: string;
  count: number;
  percentage: number;
  dropOffFromPrevious: number | null;
}

export interface PipelineFunnelAnalytics {
  pipelineId: string;
  pipelineName: string;
  stages: PipelineStageAnalytics[];
}

export interface LeadSourceAnalytics {
  sourceName: string;
  count: number;
  percentage: number;
  won: number;
  conversionRate: number;
}

export interface AgentPerformanceAnalytics {
  userId: string;
  name: string;
  assignedLeads: number;
  won: number;
  lost: number;
  conversionRate: number;
  avgResponseTimeHours: number | null;
  avgClosingTimeDays: number | null;
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

export interface LeadTrendPoint {
  month: string;
  newLeads: number;
  won: number;
  lost: number;
}

export interface LeadStatusDistribution {
  open: number;
  won: number;
  lost: number;
  archived: number;
}

export interface RecentActivityItem {
  id: string;
  type: RecentActivityType;
  title: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}

export interface RecentActivityResult {
  items: RecentActivityItem[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface AnalyticsCacheResult<T> {
  data: T;
  cacheHit: boolean;
}
