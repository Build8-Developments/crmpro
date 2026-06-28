export const CACHE_CONFIG_KEYS = {
  analyticsTtlSeconds: 'analytics.cacheTtlSeconds',
  notificationUnreadTtlSeconds: 'notifications.unreadCountTtlSeconds',
} as const;

export const DEFAULT_ANALYTICS_CACHE_TTL_SECONDS = 300;
export const DEFAULT_NOTIFICATION_UNREAD_TTL_SECONDS = 60;

export const ANALYTICS_CACHE_PREFIX = 'analytics';
export const NOTIFICATION_UNREAD_CACHE_PREFIX = 'notifications:unread';
