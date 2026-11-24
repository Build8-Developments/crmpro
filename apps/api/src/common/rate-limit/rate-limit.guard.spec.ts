import { HttpException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';
import { AUTH_RATE_LIMIT_METADATA_KEY } from './rate-limit.constants';

function buildContext(request: { ip?: string; body?: unknown }): {
  context: ExecutionContext;
  setHeader: jest.Mock;
} {
  const setHeader = jest.fn();

  const context = {
    getHandler: () => () => undefined,
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;

  return { context, setHeader };
}

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let rateLimitService: { consume: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    rateLimitService = {
      consume: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 10,
        retryAfterSeconds: 0,
      }),
    };
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: RateLimitService, useValue: rateLimitService },
        { provide: Reflector, useValue: reflector },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.name') return 'api';
              if (key === 'rateLimit.windowSeconds') return 900;
              if (key === 'rateLimit.loginPerEmail') return 5;
              if (key === 'rateLimit.loginPerIp') return 20;
              if (key === 'rateLimit.refreshPerIp') return 60;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    guard = module.get(RateLimitGuard);
  });

  it('passes through when the route declares no rate limit', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const { context } = buildContext({ ip: '10.0.0.1', body: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(rateLimitService.consume).not.toHaveBeenCalled();
  });

  it('reads the metadata key from the handler', async () => {
    reflector.getAllAndOverride.mockReturnValue('refresh');
    const { context } = buildContext({ ip: '10.0.0.1' });

    await guard.canActivate(context);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      AUTH_RATE_LIMIT_METADATA_KEY,
      [expect.any(Function), expect.any(Function)],
    );
  });

  it('caps workspace lookups per IP', async () => {
    reflector.getAllAndOverride.mockReturnValue('workspace-lookup');
    const { context } = buildContext({ ip: '10.0.0.1' });

    await guard.canActivate(context);

    expect(rateLimitService.consume).toHaveBeenCalledTimes(1);
    expect(rateLimitService.consume).toHaveBeenCalledWith(
      'rate-limit:api:workspace-lookup:ip:10.0.0.1',
      60,
      900,
    );
  });

  it('keeps "find my workspace" out of the password-reset buckets', async () => {
    reflector.getAllAndOverride.mockReturnValue('workspace-find');
    const { context } = buildContext({
      ip: '10.0.0.1',
      body: { email: 'Sara@X.com' },
    });

    await guard.canActivate(context);

    const keys = rateLimitService.consume.mock.calls.map(
      ([key]: [string]) => key,
    );
    expect(keys).toEqual([
      'rate-limit:api:workspace-find:email:sara@x.com',
      'rate-limit:api:workspace-find:ip:10.0.0.1',
    ]);
  });

  it('allows a request under the limit and reports remaining budget', async () => {
    reflector.getAllAndOverride.mockReturnValue('refresh');
    const { context, setHeader } = buildContext({ ip: '10.0.0.1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(rateLimitService.consume).toHaveBeenCalledWith(
      'rate-limit:api:refresh:ip:10.0.0.1',
      60,
      900,
    );
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '60');
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '10');
    expect(setHeader).not.toHaveBeenCalledWith(
      'Retry-After',
      expect.anything(),
    );
  });

  it('rejects with 429 and Retry-After once the limit is exceeded', async () => {
    reflector.getAllAndOverride.mockReturnValue('refresh');
    rateLimitService.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 420,
    });
    const { context, setHeader } = buildContext({ ip: '10.0.0.1' });

    const error = await guard.canActivate(context).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(429);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '420');
    expect(setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
  });

  it('applies separate email and ip buckets to login', async () => {
    reflector.getAllAndOverride.mockReturnValue('login');
    const { context } = buildContext({
      ip: '10.0.0.1',
      body: { email: '  Owner@PrimeEstates.COM ' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(rateLimitService.consume).toHaveBeenNthCalledWith(
      1,
      'rate-limit:api:login:email:owner@primeestates.com',
      5,
      900,
    );
    expect(rateLimitService.consume).toHaveBeenNthCalledWith(
      2,
      'rate-limit:api:login:ip:10.0.0.1',
      20,
      900,
    );
  });

  it('falls back to the ip bucket alone when no usable email is present', async () => {
    reflector.getAllAndOverride.mockReturnValue('login');
    const { context } = buildContext({ ip: '10.0.0.1', body: { email: 42 } });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(rateLimitService.consume).toHaveBeenCalledTimes(1);
    expect(rateLimitService.consume).toHaveBeenCalledWith(
      'rate-limit:api:login:ip:10.0.0.1',
      20,
      900,
    );
  });

  it('refuses to build a key from an oversized email', async () => {
    reflector.getAllAndOverride.mockReturnValue('login');
    const { context } = buildContext({
      ip: '10.0.0.1',
      body: { email: 'a'.repeat(255) },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(rateLimitService.consume).toHaveBeenCalledTimes(1);
  });

  it('stops at the first exhausted bucket', async () => {
    reflector.getAllAndOverride.mockReturnValue('login');
    rateLimitService.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 900,
    });
    const { context } = buildContext({
      ip: '10.0.0.1',
      body: { email: 'owner@primeestates.com' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(rateLimitService.consume).toHaveBeenCalledTimes(1);
  });

  it('tolerates a request with no ip and no body', async () => {
    reflector.getAllAndOverride.mockReturnValue('login');
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(rateLimitService.consume).toHaveBeenCalledWith(
      'rate-limit:api:login:ip:unknown',
      20,
      900,
    );
  });
});
