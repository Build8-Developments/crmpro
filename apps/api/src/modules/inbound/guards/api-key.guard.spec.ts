import {
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantInactiveException } from '../../../common/tenant-access/tenant-access.exception';
import {
  INBOUND_BAD_KEY_PER_IP_LIMIT,
  INBOUND_MESSAGES,
  INBOUND_PER_KEY_LIMIT,
} from '../inbound.constants';
import type { ApiKeyRequest } from '../types/inbound.types';
import { ApiKeyGuard } from './api-key.guard';

const VALID_KEY = 'crm_live_valid-key-value';

describe('ApiKeyGuard', () => {
  let apiKeys: { findActiveKey: jest.Mock; touchLastUsed: jest.Mock };
  let tenantAccess: { assertTenantAccessible: jest.Mock };
  let entitlements: { getFeatureFlags: jest.Mock };
  let rateLimit: { consume: jest.Mock };
  let cache: { get: jest.Mock };
  let guard: ApiKeyGuard;
  let request: Partial<ApiKeyRequest> & { headers: Record<string, string> };
  let response: { setHeader: jest.Mock };

  const activeKey = {
    id: 'key-1',
    tenantId: 'tenant-1',
    name: 'Website form',
    sourceId: null,
    lastUsedAt: null,
  };

  const context = () =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ExecutionContext;

  const expectStatus = async (status: number, message?: string) => {
    const error = await guard.canActivate(context()).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(status);
    if (message) expect((error as HttpException).message).toBe(message);
  };

  beforeEach(() => {
    apiKeys = {
      findActiveKey: jest.fn().mockResolvedValue(activeKey),
      touchLastUsed: jest.fn().mockResolvedValue(undefined),
    };
    tenantAccess = {
      assertTenantAccessible: jest.fn().mockResolvedValue(undefined),
    };
    entitlements = {
      getFeatureFlags: jest.fn().mockResolvedValue({ apiAccess: true }),
    };
    rateLimit = {
      consume: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 59,
        retryAfterSeconds: 0,
      }),
    };
    cache = { get: jest.fn().mockResolvedValue(null) };
    guard = new ApiKeyGuard(
      apiKeys as never,
      tenantAccess as never,
      entitlements as never,
      rateLimit as never,
      cache as never,
      { get: jest.fn().mockReturnValue('crm-api') } as never,
    );
    request = { headers: { 'x-api-key': VALID_KEY }, ip: '203.0.113.7' };
    response = { setHeader: jest.fn() };
  });

  it('accepts a valid key and attaches it to the request', async () => {
    await expect(guard.canActivate(context())).resolves.toBe(true);

    expect(apiKeys.findActiveKey).toHaveBeenCalledWith(VALID_KEY);
    expect(request.apiKey).toEqual(activeKey);
    expect(rateLimit.consume).toHaveBeenCalledWith(
      'rate-limit:crm-api:inbound:key:key-1',
      INBOUND_PER_KEY_LIMIT,
      60,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Remaining',
      '59',
    );
    expect(tenantAccess.assertTenantAccessible).toHaveBeenCalledWith(
      'tenant-1',
    );
    expect(apiKeys.touchLastUsed).toHaveBeenCalledWith(
      activeKey,
      expect.any(Date),
      60_000,
    );
  });

  it('accepts the key as a Bearer token', async () => {
    request.headers = { authorization: `Bearer ${VALID_KEY}` };

    await expect(guard.canActivate(context())).resolves.toBe(true);
    expect(apiKeys.findActiveKey).toHaveBeenCalledWith(VALID_KEY);
  });

  it('401s without a key', async () => {
    request.headers = {};

    await expect(guard.canActivate(context())).rejects.toThrow(
      new UnauthorizedException(INBOUND_MESSAGES.MISSING_KEY),
    );
    expect(apiKeys.findActiveKey).not.toHaveBeenCalled();
  });

  it('401s on an unknown or revoked key and counts the failure per IP', async () => {
    apiKeys.findActiveKey.mockResolvedValue(null);

    await expectStatus(HttpStatus.UNAUTHORIZED, INBOUND_MESSAGES.INVALID_KEY);
    expect(rateLimit.consume).toHaveBeenCalledWith(
      'rate-limit:crm-api:inbound:bad-key:ip:203.0.113.7',
      INBOUND_BAD_KEY_PER_IP_LIMIT,
      900,
    );
    expect(tenantAccess.assertTenantAccessible).not.toHaveBeenCalled();
  });

  it('429s once an IP exceeds the bad-key budget', async () => {
    apiKeys.findActiveKey.mockResolvedValue(null);
    rateLimit.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 120,
    });

    await expectStatus(HttpStatus.TOO_MANY_REQUESTS, INBOUND_MESSAGES.BLOCKED);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '120');
  });

  it('refuses a blocked IP before looking any key up (even a valid one)', async () => {
    cache.get.mockResolvedValue(INBOUND_BAD_KEY_PER_IP_LIMIT);

    await expectStatus(HttpStatus.TOO_MANY_REQUESTS, INBOUND_MESSAGES.BLOCKED);
    expect(apiKeys.findActiveKey).not.toHaveBeenCalled();
  });

  it('fails open when the Redis peek errors', async () => {
    cache.get.mockRejectedValue(new Error('redis down'));

    await expect(guard.canActivate(context())).resolves.toBe(true);
  });

  it('429s with Retry-After when the key is over its rate limit', async () => {
    rateLimit.consume.mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 42,
    });

    await expectStatus(
      HttpStatus.TOO_MANY_REQUESTS,
      INBOUND_MESSAGES.RATE_LIMITED,
    );
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '42');
    expect(tenantAccess.assertTenantAccessible).not.toHaveBeenCalled();
  });

  it('403s for a suspended workspace', async () => {
    tenantAccess.assertTenantAccessible.mockRejectedValue(
      new TenantInactiveException('Tenant account is suspended.'),
    );

    await expectStatus(HttpStatus.FORBIDDEN, 'Tenant account is suspended.');
    expect(request.apiKey).toBeUndefined();
  });

  it('403s with a clear message when the plan has no API access', async () => {
    entitlements.getFeatureFlags.mockResolvedValue({ importExport: true });

    await expect(guard.canActivate(context())).rejects.toThrow(
      new ForbiddenException(INBOUND_MESSAGES.PLAN_REQUIRED),
    );
    expect(apiKeys.touchLastUsed).not.toHaveBeenCalled();
  });
});
