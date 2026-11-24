import * as Joi from 'joi';
import { parseWorkspaceUrlTemplate } from '@crmpro/shared/workspaces';

/** https://{slug}.nomow.app, https://{slug}-staging.nomow.app, http://{slug}.localhost:3001 */
function workspaceUrlTemplate() {
  return Joi.string().custom((value: string, helpers) =>
    parseWorkspaceUrlTemplate(value)
      ? value
      : helpers.message({
          custom:
            'WORKSPACE_URL_TEMPLATE must look like https://{slug}.example.com or https://{slug}-staging.example.com (no path)',
        }),
  );
}

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().port().optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  BULL_PREFIX: Joi.string().default('crmpro'),
  BULL_IMPORT_CONCURRENCY: Joi.number().integer().min(1).optional(),
  BULL_EXPORT_CONCURRENCY: Joi.number().integer().min(1).optional(),
  BULL_CLEANUP_CONCURRENCY: Joi.number().integer().min(1).optional(),
  BULL_JOB_ATTEMPTS: Joi.number().integer().min(1).optional(),
  BULL_JOB_BACKOFF_DELAY_MS: Joi.number().integer().min(1).optional(),
  UPLOAD_INTENT_TTL_MINUTES: Joi.number().integer().min(1).optional(),
  IMPORT_JOB_TIMEOUT_MINUTES: Joi.number().integer().min(1).optional(),
  EXPORT_JOB_TIMEOUT_MINUTES: Joi.number().integer().min(1).optional(),
  SESSION_RETENTION_DAYS: Joi.number().integer().min(0).optional(),
  CLEANUP_BATCH_SIZE: Joi.number().integer().min(1).optional(),
  CLEANUP_UPLOAD_INTENTS_INTERVAL_MS: Joi.number().integer().min(1).optional(),
  CLEANUP_STALE_JOBS_INTERVAL_MS: Joi.number().integer().min(1).optional(),
  CLEANUP_SESSIONS_INTERVAL_MS: Joi.number().integer().min(1).optional(),
  CLEANUP_ORPHAN_S3_CRON: Joi.string().optional(),
  LOG_LEVEL: Joi.string().valid('debug', 'info', 'warn', 'error').optional(),
  ENABLE_HTTP_LOGGING: Joi.string().valid('true', 'false', '1', '0').optional(),
  ENABLE_WORKER_LOGGING: Joi.string()
    .valid('true', 'false', '1', '0')
    .optional(),
  ENABLE_QUERY_LOGGING: Joi.string()
    .valid('true', 'false', '1', '0')
    .optional(),
  ENABLE_STORAGE_LOGGING: Joi.string()
    .valid('true', 'false', '1', '0')
    .optional(),
  ENABLE_AUTH_LOGGING: Joi.string().valid('true', 'false', '1', '0').optional(),
  SLOW_QUERY_THRESHOLD_MS: Joi.number().integer().min(1).optional(),
  API_VERSION: Joi.string().optional(),
  INTERNAL_MONITORING_KEY: Joi.string().min(16).optional(),
  ANALYTICS_CACHE_TTL_SECONDS: Joi.number().integer().min(1).optional(),
  NOTIFICATION_UNREAD_TTL_SECONDS: Joi.number().integer().min(1).optional(),
  BULL_NOTIFICATION_CONCURRENCY: Joi.number().integer().min(1).optional(),
  // HS256 secrets shorter than 32 chars are brute-forceable offline.
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  /** Reverse-proxy hops in front of the app; client IPs come from X-Forwarded-For only that deep. */
  ENABLE_SWAGGER: Joi.boolean().optional(),
  // Email. "log" prints messages (development only — it would print reset and
  // invite links), "smtp" sends them. Production must send.
  MAIL_TRANSPORT: Joi.string()
    .valid('log', 'smtp')
    .default('log')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.valid('smtp').required(),
    }),
  MAIL_FROM: Joi.string().default('Nomow <no-reply@crmpro.local>'),
  SMTP_HOST: Joi.string().when('MAIL_TRANSPORT', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  /** Public origin of the web app, used in email links. */
  APP_WEB_URL: Joi.string().uri().default('http://localhost:3001'),
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(10).default(1),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
  REFRESH_COOKIE_CROSS_ORIGIN: Joi.string().valid('true', 'false').optional(),
  JWT_REFRESH_EXPIRATION: Joi.string().optional(),
  CORS_ORIGINS: Joi.string().min(1).required(),
  // Each workspace's own host. Emails link to it, the realtime socket accepts
  // it as an origin, and sign-in from it is bound to that workspace. Required
  // in production: without it every link would point at the bare domain.
  WORKSPACE_URL_TEMPLATE: workspaceUrlTemplate().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET: Joi.string().required(),
  AWS_S3_ENDPOINT: Joi.string().uri().optional(),
}).or('REDIS_URL', 'REDIS_HOST');
