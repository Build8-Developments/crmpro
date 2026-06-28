export const CACHE_CONFIG_KEYS = {
  analyticsTtlSeconds: 'analytics.cacheTtlSeconds',
  notificationUnreadTtlSeconds: 'notifications.unreadCountTtlSeconds',
  automationCacheTtlSeconds: 'automation.cacheTtlSeconds',
  taskCacheTtlSeconds: 'tasks.cacheTtlSeconds',
} as const;

export const DEFAULT_ANALYTICS_CACHE_TTL_SECONDS = 300;
export const DEFAULT_NOTIFICATION_UNREAD_TTL_SECONDS = 60;
export const DEFAULT_AUTOMATION_CACHE_TTL_SECONDS = 300;
export const DEFAULT_TASK_CACHE_TTL_SECONDS = 300;

export const ANALYTICS_CACHE_PREFIX = 'analytics';
export const NOTIFICATION_UNREAD_CACHE_PREFIX = 'notifications:unread';
export const AUTOMATION_WORKFLOW_CACHE_PREFIX = 'automation:workflows';
export const TASK_DASHBOARD_CACHE_PREFIX = 'tasks:dashboard';
export const TASK_CALENDAR_CACHE_PREFIX = 'tasks:calendar';
