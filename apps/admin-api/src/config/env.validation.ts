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
  PORT: Joi.number().port().default(3100),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().optional(),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().port().optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  TENANT_API_URL: Joi.string().uri().optional(),
  INTERNAL_MONITORING_KEY: Joi.string().min(16).optional(),
  STUCK_JOB_TIMEOUT_MINUTES: Joi.number().integer().min(1).optional(),
  // HS256 secrets shorter than 32 chars are brute-forceable offline.
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  /** Reverse-proxy hops in front of the app; client IPs come from X-Forwarded-For only that deep. */
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(10).default(1),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),
  REFRESH_COOKIE_CROSS_ORIGIN: Joi.string().valid('true', 'false').optional(),
  CORS_ORIGINS: Joi.string().min(1).required(),
  // Links to each workspace's own host. Required in production: without it
  // the admin app cannot show where a tenant signs in.
  WORKSPACE_URL_TEMPLATE: workspaceUrlTemplate().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  API_VERSION: Joi.string().optional(),
}).or('REDIS_URL', 'REDIS_HOST');
