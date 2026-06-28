export interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
}

export interface BullConfig {
  prefix: string;
  importConcurrency: number;
  exportConcurrency: number;
  jobAttempts: number;
  jobBackoffDelayMs: number;
}

export function parseRedisUrl(url: string): RedisConnectionConfig {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 6379,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
  };
}

export function resolveRedisConnectionConfig(env: {
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
}): RedisConnectionConfig {
  const fromUrl = env.REDIS_URL ? parseRedisUrl(env.REDIS_URL) : null;

  return {
    host: env.REDIS_HOST ?? fromUrl?.host ?? 'localhost',
    port: env.REDIS_PORT
      ? parseInt(env.REDIS_PORT, 10)
      : (fromUrl?.port ?? 6379),
    password: env.REDIS_PASSWORD ?? fromUrl?.password,
  };
}
