export const ANALYTICS_ENDPOINTS = {
  overview: 'overview',
  pipeline: 'pipeline',
  sources: 'sources',
  agents: 'agents',
  projects: 'projects',
  developers: 'developers',
  trends: 'trends',
  status: 'status',
  recentActivity: 'recent-activity',
  dashboard: 'dashboard',
  team: 'team',
  activity: 'activity',
} as const;

export const ANALYTICS_RANGE_KEYS = ['7d', '30d', '90d'] as const;
export type AnalyticsRangeKey = (typeof ANALYTICS_RANGE_KEYS)[number];
export const ANALYTICS_RANGE_DEFAULT: AnalyticsRangeKey = '30d';

export const ANALYTICS_RANGE_DAYS: Record<AnalyticsRangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export const STALE_LEAD_DAYS = 7;
export const TEAM_TOP_PERFORMERS_LIMIT = 5;
export const ACTIVITY_FEED_LIMIT = 20;

export type AnalyticsEndpoint =
  (typeof ANALYTICS_ENDPOINTS)[keyof typeof ANALYTICS_ENDPOINTS];

export const DEFAULT_TREND_MONTHS = 12;
export const DEFAULT_RECENT_ACTIVITY_LIMIT = 20;
export const UNKNOWN_SOURCE_LABEL = 'Unknown';

export const RECENT_ACTIVITY_EVENT_TYPES = [
  'LEAD_CREATED',
  'LEAD_ASSIGNED',
  'STAGE_CHANGED',
  'IMPORT_COMPLETED',
  'EXPORT_COMPLETED',
] as const;

export type RecentActivityType = (typeof RECENT_ACTIVITY_EVENT_TYPES)[number];
