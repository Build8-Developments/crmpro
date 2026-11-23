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
  CONSUME_SCRIPT,
  RATE_LIMIT_COMMAND_TIMEOUT_MS,
} from './rate-limit.constants';

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

type RateLimitRedis = Redis & {
  consumeRateLimit(key: string, windowMs: number): Promise<[number, number]>;
};

@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private redis?: RateLimitRedis;

  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const connection = resolveRedisConnectionConfig({
      REDIS_URL: this.configService.get<string>('redis.url'),
      REDIS_HOST: this.configService.get<string>('redis.host'),
      REDIS_PORT: String(this.configService.get<number>('redis.port') ?? 6379),
      REDIS_PASSWORD: this.configService.get<string>('redis.password'),
    });

    // Fail open requires commands to reject rather than buffer or retry: ioredis
    // queues them in memory by default while disconnected and then retries each
    // command up to 20 times, either of which stalls the auth request. Skipping
    // the limit is always the cheaper outcome.
    const client = new Redis({
      ...connection,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      commandTimeout: RATE_LIMIT_COMMAND_TIMEOUT_MS,
    }) as RateLimitRedis;

    client.defineCommand('consumeRateLimit', {
      numberOfKeys: 1,
      lua: CONSUME_SCRIPT,
    });

    client.on('error', (error: Error) => {
      this.logger.error(`Rate limit redis error: ${error.message}`);
    });

    this.redis = client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = undefined;
    }
  }

  async consume(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitDecision> {
    if (!this.redis) {
      return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
    }

    try {
      const [count, ttlMs] = await this.redis.consumeRateLimit(
        key,
        windowSeconds * 1000,
      );

      const allowed = count <= limit;

      return {
        allowed,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(ttlMs / 1000)),
      };
    } catch (error) {
      // Fail open: a Redis outage must not lock every user out of the product.
      this.logger.warn(
        `Rate limiting unavailable, allowing request: ${
          (error as Error).message
        }`,
      );

      return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
    }
  }
}
