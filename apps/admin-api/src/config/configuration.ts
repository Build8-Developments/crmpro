import {
  RedisConnectionConfig,
  resolveRedisConnectionConfig,
} from '@crmpro/shared';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

export default () => {
  const redisConnection = resolveRedisConnectionConfig({
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  });

  return {
    app: {
      // Namespaces this plane's keys in the Redis both APIs share (rate limits).
      name: 'admin-api',
      port: parseInt(process.env.PORT ?? '3100', 10),
      nodeEnv: process.env.NODE_ENV ?? 'development',
      version: process.env.API_VERSION ?? '1.0.0',
      trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS ?? '1', 10),
    },
    database: {
      url: process.env.DATABASE_URL,
    },
    redis: {
      url: process.env.REDIS_URL,
      ...redisConnection,
    } satisfies RedisConnectionConfig & { url?: string },
    tenantApi: {
      baseUrl: process.env.TENANT_API_URL ?? 'http://localhost:3000/api/v1',
      internalMonitoringKey: process.env.INTERNAL_MONITORING_KEY,
    },
    jobs: {
      stuckTimeoutMinutes: parseInt(
        process.env.STUCK_JOB_TIMEOUT_MINUTES ?? '15',
        10,
      ),
    },
    auth: {
      accessSecret: process.env.JWT_ACCESS_SECRET,
      accessExpiration: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
      refreshExpiration: process.env.JWT_REFRESH_EXPIRATION ?? '30d',
      /** SameSite=None; Secure refresh cookie when the admin SPA is on another site (prod only). */
      refreshCookieCrossOrigin: parseBoolean(
        process.env.REFRESH_COOKIE_CROSS_ORIGIN,
        false,
      ),
    },
    workspaces: {
      // e.g. https://{slug}.nomow.app: shown on each tenant in the admin app.
      // Development falls back to *.localhost (resolves to this machine);
      // production must set it (env.validation).
      urlTemplate:
        process.env.WORKSPACE_URL_TEMPLATE?.trim() ||
        (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
          ? 'http://{slug}.localhost:3001'
          : null),
    },
    cors: {
      origins: (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    },
  };
};
