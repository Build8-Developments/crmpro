import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { RateLimitService } from './rate-limit.service';
import {
  AUTH_RATE_LIMIT_METADATA_KEY,
  AuthRateLimitKind,
  DEFAULT_LOGIN_PER_EMAIL_LIMIT,
  DEFAULT_LOGIN_PER_IP_LIMIT,
  DEFAULT_RATE_LIMIT_PLANE,
  DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_REFRESH_PER_IP_LIMIT,
  DEFAULT_ACCOUNT_TOKEN_PER_IP_LIMIT,
  DEFAULT_PASSWORD_RESET_PER_EMAIL_LIMIT,
  DEFAULT_PASSWORD_RESET_PER_IP_LIMIT,
  MAX_EMAIL_KEY_LENGTH,
  RATE_LIMIT_CONFIG_KEYS,
  RATE_LIMIT_KEY_PREFIX,
  RATE_LIMIT_MESSAGE,
} from './rate-limit.constants';

interface RateLimitBucket {
  key: string;
  limit: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const kind = this.reflector.getAllAndOverride<
      AuthRateLimitKind | undefined
    >(AUTH_RATE_LIMIT_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!kind) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const clientIp = request.ip ?? 'unknown';

    const windowSeconds =
      this.configService.get<number>(RATE_LIMIT_CONFIG_KEYS.windowSeconds) ??
      DEFAULT_RATE_LIMIT_WINDOW_SECONDS;

    const plane =
      this.configService.get<string>(RATE_LIMIT_CONFIG_KEYS.plane) ??
      DEFAULT_RATE_LIMIT_PLANE;
    const keyPrefix = `${RATE_LIMIT_KEY_PREFIX}:${plane}`;

    for (const bucket of this.resolveBuckets(
      kind,
      keyPrefix,
      clientIp,
      request.body,
    )) {
      const decision = await this.rateLimitService.consume(
        bucket.key,
        bucket.limit,
        windowSeconds,
      );

      response.setHeader('X-RateLimit-Limit', String(bucket.limit));
      response.setHeader('X-RateLimit-Remaining', String(decision.remaining));

      if (!decision.allowed) {
        response.setHeader('Retry-After', String(decision.retryAfterSeconds));
        throw new HttpException(
          RATE_LIMIT_MESSAGE,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  // Login needs two independent buckets: keyed on the account alone so a
  // credential stuffed from many IPs is still bounded, and keyed on the source
  // alone so one host cannot enumerate every account. Keying on both together
  // would defeat the first case.
  private resolveBuckets(
    kind: AuthRateLimitKind,
    keyPrefix: string,
    clientIp: string,
    body: unknown,
  ): RateLimitBucket[] {
    if (kind === 'account-token') {
      return [
        {
          key: `${keyPrefix}:account-token:ip:${clientIp}`,
          limit: DEFAULT_ACCOUNT_TOKEN_PER_IP_LIMIT,
        },
      ];
    }

    if (kind === 'password-reset') {
      const email = normalizeEmail(body);
      return [
        ...(email
          ? [
              {
                key: `${keyPrefix}:password-reset:email:${email}`,
                limit: DEFAULT_PASSWORD_RESET_PER_EMAIL_LIMIT,
              },
            ]
          : []),
        {
          key: `${keyPrefix}:password-reset:ip:${clientIp}`,
          limit: DEFAULT_PASSWORD_RESET_PER_IP_LIMIT,
        },
      ];
    }

    if (kind === 'refresh') {
      return [
        {
          key: `${keyPrefix}:refresh:ip:${clientIp}`,
          limit:
            this.configService.get<number>(
              RATE_LIMIT_CONFIG_KEYS.refreshPerIp,
            ) ?? DEFAULT_REFRESH_PER_IP_LIMIT,
        },
      ];
    }

    const buckets: RateLimitBucket[] = [
      {
        key: `${keyPrefix}:login:ip:${clientIp}`,
        limit:
          this.configService.get<number>(RATE_LIMIT_CONFIG_KEYS.loginPerIp) ??
          DEFAULT_LOGIN_PER_IP_LIMIT,
      },
    ];

    const email = normalizeEmail(body);
    if (email) {
      buckets.unshift({
        key: `${keyPrefix}:login:email:${email}`,
        limit:
          this.configService.get<number>(
            RATE_LIMIT_CONFIG_KEYS.loginPerEmail,
          ) ?? DEFAULT_LOGIN_PER_EMAIL_LIMIT,
      });
    }

    return buckets;
  }
}

function normalizeEmail(body: unknown): string | null {
  const candidate = (body as { email?: unknown } | undefined)?.email;

  if (typeof candidate !== 'string') {
    return null;
  }

  const email = candidate.trim().toLowerCase();

  if (!email || email.length > MAX_EMAIL_KEY_LENGTH) {
    return null;
  }

  return email;
}
