import {
  BullConfig,
  RedisConnectionConfig,
  resolveRedisConnectionConfig,
} from '../common/redis/redis.config';

export default () => {
  const redisConnection = resolveRedisConnectionConfig({
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  });

  return {
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL,
    ...redisConnection,
  } satisfies RedisConnectionConfig & { url?: string },
  bull: {
    prefix: process.env.BULL_PREFIX ?? 'crmpro',
    importConcurrency: parseInt(process.env.BULL_IMPORT_CONCURRENCY ?? '3', 10),
    exportConcurrency: parseInt(process.env.BULL_EXPORT_CONCURRENCY ?? '2', 10),
    jobAttempts: parseInt(process.env.BULL_JOB_ATTEMPTS ?? '3', 10),
    jobBackoffDelayMs: parseInt(process.env.BULL_JOB_BACKOFF_DELAY_MS ?? '3000', 10),
  } satisfies BullConfig,
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
    refreshTokenExpiration:
      process.env.REFRESH_TOKEN_EXPIRATION ??
      process.env.JWT_REFRESH_EXPIRATION ??
      '7d',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  storage: {
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_S3_BUCKET,
    endpoint: process.env.AWS_S3_ENDPOINT,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  };
};
