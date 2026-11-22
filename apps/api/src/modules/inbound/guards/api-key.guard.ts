import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { CacheService } from '../../../common/cache/cache.service';
import { PLAN_FEATURES } from '../../../common/entitlements/entitlement.constants';
import { PlanEntitlementService } from '../../../common/entitlements/plan-entitlement.service';
import {
  DEFAULT_RATE_LIMIT_PLANE,
  RATE_LIMIT_CONFIG_KEYS,
  RATE_LIMIT_KEY_PREFIX,
} from '../../../common/rate-limit/rate-limit.constants';
import { RateLimitService } from '../../../common/rate-limit/rate-limit.service';
import { TenantAccessService } from '../../../common/tenant-access/tenant-access.service';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import {
  API_KEY_TOUCH_INTERVAL_MS,
  INBOUND_BAD_KEY_PER_IP_LIMIT,
  INBOUND_BAD_KEY_WINDOW_SECONDS,
  INBOUND_MESSAGES,
  INBOUND_PER_KEY_LIMIT,
  INBOUND_PER_KEY_WINDOW_SECONDS,
  INBOUND_REDIS_PEEK_TIMEOUT_MS,
} from '../inbound.constants';
import type { ApiKeyRequest } from '../types/inbound.types';

/**
 * Authenticates integrations by API key (`Authorization: Bearer <key>` or
 * `X-Api-Key`). Order matters: an IP that keeps sending bad keys is refused
 * before any lookup, a valid key is rate-limited before the tenant/plan
 * queries, and the tenant must pass the same gates a signed-in user would.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeys: ApiKeysService,
    private readonly tenantAccess: TenantAccessService,
    private readonly entitlements: PlanEntitlementService,
    private readonly rateLimit: RateLimitService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<ApiKeyRequest>();
    const response = http.getResponse<Response>();

    const rawKey = extractApiKey(request);
    if (!rawKey) {
      throw new UnauthorizedException(INBOUND_MESSAGES.MISSING_KEY);
    }

    const keyPrefix = this.keyPrefix();
    const badKeyBucket = `${keyPrefix}:inbound:bad-key:ip:${request.ip ?? 'unknown'}`;

    if (await this.isBlocked(badKeyBucket)) {
      this.refuse(
        response,
        INBOUND_BAD_KEY_WINDOW_SECONDS,
        INBOUND_MESSAGES.BLOCKED,
      );
    }

    const key = await this.apiKeys.findActiveKey(rawKey);
    if (!key) {
      const decision = await this.rateLimit.consume(
        badKeyBucket,
        INBOUND_BAD_KEY_PER_IP_LIMIT,
        INBOUND_BAD_KEY_WINDOW_SECONDS,
      );
      if (!decision.allowed) {
        this.refuse(
          response,
          decision.retryAfterSeconds,
          INBOUND_MESSAGES.BLOCKED,
        );
      }
      throw new UnauthorizedException(INBOUND_MESSAGES.INVALID_KEY);
    }

    const decision = await this.rateLimit.consume(
      `${keyPrefix}:inbound:key:${key.id}`,
      INBOUND_PER_KEY_LIMIT,
      INBOUND_PER_KEY_WINDOW_SECONDS,
    );
    response.setHeader('X-RateLimit-Limit', String(INBOUND_PER_KEY_LIMIT));
    response.setHeader('X-RateLimit-Remaining', String(decision.remaining));
    if (!decision.allowed) {
      this.refuse(
        response,
        decision.retryAfterSeconds,
        INBOUND_MESSAGES.RATE_LIMITED,
      );
    }

    // Suspended / lapsed workspaces: 403 with the tenant-access message.
    await this.tenantAccess.assertTenantAccessible(key.tenantId);

    const flags = await this.entitlements.getFeatureFlags(key.tenantId);
    if (flags[PLAN_FEATURES.API_ACCESS] !== true) {
      throw new ForbiddenException(INBOUND_MESSAGES.PLAN_REQUIRED);
    }

    void this.apiKeys.touchLastUsed(key, new Date(), API_KEY_TOUCH_INTERVAL_MS);

    request.apiKey = key;
    return true;
  }

  private keyPrefix(): string {
    const plane =
      this.config.get<string>(RATE_LIMIT_CONFIG_KEYS.plane) ??
      DEFAULT_RATE_LIMIT_PLANE;
    return `${RATE_LIMIT_KEY_PREFIX}:${plane}`;
  }

  /**
   * Reads the failure counter without adding to it. Fails open: a slow or
   * missing Redis must not stop lead intake.
   */
  private async isBlocked(bucket: string): Promise<boolean> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const count = await Promise.race([
        this.cache.get<number>(bucket),
        new Promise<null>((resolve) => {
          timer = setTimeout(
            () => resolve(null),
            INBOUND_REDIS_PEEK_TIMEOUT_MS,
          );
        }),
      ]);
      return typeof count === 'number' && count >= INBOUND_BAD_KEY_PER_IP_LIMIT;
    } catch {
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private refuse(
    response: Response,
    retryAfterSeconds: number,
    message: string,
  ): never {
    response.setHeader('Retry-After', String(Math.max(1, retryAfterSeconds)));
    throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

function extractApiKey(request: ApiKeyRequest): string | null {
  const header = request.headers['x-api-key'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (fromHeader?.trim()) {
    return fromHeader.trim();
  }

  const authorization = request.headers.authorization;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
