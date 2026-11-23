import { ExecutionContext } from '@nestjs/common';
import { API_ERROR_CODES } from '@crmpro/shared';
import { lastValueFrom, of } from 'rxjs';
import { TenantReadOnlyException } from './tenant-access.exception';
import type { TenantAccessService } from './tenant-access.service';
import { TenantReadOnlyInterceptor } from './tenant-read-only.interceptor';

describe('TenantReadOnlyInterceptor', () => {
  const accessEndsAt = new Date('2027-01-12T23:59:59.999Z');
  let tenantAccess: { getCachedTenantAccessState: jest.Mock };
  let interceptor: TenantReadOnlyInterceptor;
  let handle: jest.Mock;

  function contextFor(request: Record<string, unknown>): ExecutionContext {
    return {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  function run(request: Record<string, unknown>) {
    return lastValueFrom(
      interceptor.intercept(contextFor(request), { handle }),
    );
  }

  const user = { tenantId: 'tenant-1' };

  beforeEach(() => {
    tenantAccess = {
      getCachedTenantAccessState: jest
        .fn()
        .mockResolvedValue({ readOnly: true, accessEndsAt }),
    };
    interceptor = new TenantReadOnlyInterceptor(
      tenantAccess as unknown as TenantAccessService,
    );
    handle = jest.fn(() => of('ok'));
  });

  it('refuses a write from a read-only tenant with TENANT_READ_ONLY', async () => {
    const error = await run({
      method: 'POST',
      route: { path: '/api/v1/leads' },
      user,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TenantReadOnlyException);
    const exception = error as TenantReadOnlyException;
    expect(exception.getStatus()).toBe(403);
    expect(exception.getResponse()).toEqual({
      code: API_ERROR_CODES.TENANT_READ_ONLY,
      message:
        'This workspace is read-only until 12 Jan 2027 because its contract ended. You can still view and export your data.',
      details: { accessEndsAt: '2027-01-12T23:59:59.999Z' },
    });
    expect(handle).not.toHaveBeenCalled();
  });

  it.each(['PUT', 'PATCH', 'DELETE'])('refuses %s', async (method) => {
    await expect(
      run({ method, route: { path: '/api/v1/leads/:id' }, user }),
    ).rejects.toBeInstanceOf(TenantReadOnlyException);
  });

  it('lets reads through without checking the tenant', async () => {
    await expect(
      run({ method: 'GET', route: { path: '/api/v1/leads' }, user }),
    ).resolves.toBe('ok');
    expect(tenantAccess.getCachedTenantAccessState).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', '/api/v1/auth/logout'],
    ['POST', '/api/v1/me/password'],
    ['POST', '/api/v1/export-jobs/leads'],
    ['PATCH', '/api/v1/notifications/:id/read'],
    ['PATCH', '/api/v1/notifications/read-all'],
    ['POST', '/api/v1/files/folders/:id/unlock'],
  ])('allows %s %s', async (method, path) => {
    await expect(run({ method, route: { path }, user })).resolves.toBe('ok');
  });

  it('does not allow a route just because it starts like an allowed one', async () => {
    await expect(
      run({
        method: 'DELETE',
        route: { path: '/api/v1/notifications/:id' },
        user,
      }),
    ).rejects.toBeInstanceOf(TenantReadOnlyException);
  });

  it('refuses inbound API-key writes for a read-only tenant', async () => {
    await expect(
      run({
        method: 'POST',
        route: { path: '/api/v1/inbound/leads' },
        apiKey: { tenantId: 'tenant-1' },
      }),
    ).rejects.toBeInstanceOf(TenantReadOnlyException);
  });

  it('lets writes through for tenants with full access', async () => {
    tenantAccess.getCachedTenantAccessState.mockResolvedValue({
      readOnly: false,
      accessEndsAt: null,
    });

    await expect(
      run({ method: 'POST', route: { path: '/api/v1/leads' }, user }),
    ).resolves.toBe('ok');
  });

  it('ignores requests without a tenant (public routes)', async () => {
    await expect(
      run({ method: 'POST', route: { path: '/api/v1/auth/accept-invite' } }),
    ).resolves.toBe('ok');
    expect(tenantAccess.getCachedTenantAccessState).not.toHaveBeenCalled();
  });
});
