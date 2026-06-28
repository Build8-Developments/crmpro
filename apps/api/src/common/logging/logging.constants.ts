export const LOGGING_CONFIG_KEYS = {
  logLevel: 'logging.logLevel',
  enableHttpLogging: 'logging.enableHttpLogging',
  enableWorkerLogging: 'logging.enableWorkerLogging',
  enableQueryLogging: 'logging.enableQueryLogging',
  enableStorageLogging: 'logging.enableStorageLogging',
  enableAuthLogging: 'logging.enableAuthLogging',
  slowQueryThresholdMs: 'logging.slowQueryThresholdMs',
} as const;

export const DEFAULT_LOG_LEVEL = 'info';
export const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 250;

export const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
]);

export const SENSITIVE_BODY_FIELDS = new Set([
  'password',
  'refreshToken',
  'accessToken',
  'token',
  'currentPassword',
  'newPassword',
]);
