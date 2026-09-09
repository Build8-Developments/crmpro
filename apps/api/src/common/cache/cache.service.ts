import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { resolveRedisConnectionConfig } from '@crmpro/shared';
import {
  ANALYTICS_CACHE_PREFIX,
  CACHE_CONFIG_KEYS,
  DEFAULT_ANALYTICS_CACHE_TTL_SECONDS,
  DEFAULT_NOTIFICATION_UNREAD_TTL_SECONDS,
  NOTIFICATION_UNREAD_CACHE_PREFIX,
} from './cache.constants';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis?: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const connection = resolveRedisConnectionConfig({
      REDIS_URL: this.configService.get<string>('redis.url'),
      REDIS_HOST: this.configService.get<string>('redis.host'),
      REDIS_PORT: String(this.configService.get<number>('redis.port') ?? 6379),
      REDIS_PASSWORD: this.configService.get<string>('redis.password'),
    });

    this.redis = new Redis(connection);

    this.redis.on('error', (error: Error) => {
      this.logger.error(`Redis cache error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = undefined;
    }
  }

  getAnalyticsTtlSeconds(): number {
    return (
      this.configService.get<number>(CACHE_CONFIG_KEYS.analyticsTtlSeconds) ??
      DEFAULT_ANALYTICS_CACHE_TTL_SECONDS
    );
  }

  getNotificationUnreadTtlSeconds(): number {
    return (
      this.configService.get<number>(
        CACHE_CONFIG_KEYS.notificationUnreadTtlSeconds,
      ) ?? DEFAULT_NOTIFICATION_UNREAD_TTL_SECONDS
    );
  }

  buildNotificationUnreadKey(tenantId: string, userId: string): string {
    return `${NOTIFICATION_UNREAD_CACHE_PREFIX}:${tenantId}:${userId}`;
  }

  async invalidateNotificationUnreadCount(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.del(this.buildNotificationUnreadKey(tenantId, userId));
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      return null;
    }

    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    let cursor = '0';
    let deleted = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== '0');

    return deleted;
  }

  buildAnalyticsKey(
    tenantId: string,
    endpoint: string,
    from?: string,
    to?: string,
    extra?: string,
  ): string {
    const parts = [
      ANALYTICS_CACHE_PREFIX,
      tenantId,
      endpoint,
      from ?? 'all',
      to ?? 'all',
    ];

    if (extra) {
      parts.push(extra);
    }

    return parts.join(':');
  }

  async invalidateTenantAnalytics(tenantId: string): Promise<void> {
    await this.deleteByPattern(`${ANALYTICS_CACHE_PREFIX}:${tenantId}:*`);
  }
}
