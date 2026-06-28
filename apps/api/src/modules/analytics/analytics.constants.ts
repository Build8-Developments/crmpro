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
  tasks: 'tasks',
  export: 'export',
} as const;

export type AnalyticsEndpoint =
  (typeof ANALYTICS_ENDPOINTS)[keyof typeof ANALYTICS_ENDPOINTS];

export const ANALYTICS_EXPORT_FORMATS = ['CSV', 'PDF'] as const;
export type AnalyticsExportFormat = (typeof ANALYTICS_EXPORT_FORMATS)[number];

export const DEFAULT_TREND_MONTHS = 12;
export const DEFAULT_RECENT_ACTIVITY_LIMIT = 20;
export const UNKNOWN_SOURCE_LABEL = 'Unknown';

/** Activity types that count as an agent response after lead creation */
export const AGENT_RESPONSE_EVENT_TYPES = [
  'ASSIGNED',
  'REASSIGNED',
  'STAGE_CHANGED',
  'NOTE_ADDED',
  'CALL_LOGGED',
  'EMAIL_LOGGED',
  'WHATSAPP_LOGGED',
] as const;

export const RECENT_ACTIVITY_EVENT_TYPES = [
  'LEAD_CREATED',
  'LEAD_ASSIGNED',
  'STAGE_CHANGED',
  'IMPORT_COMPLETED',
  'EXPORT_COMPLETED',
] as const;

export type RecentActivityType = (typeof RECENT_ACTIVITY_EVENT_TYPES)[number];
