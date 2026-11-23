import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import {
  RequirePlanFeature,
  WaiveFeatureWhenReadOnly,
} from '../decorators/require-plan-feature.decorator';
import { PlanEntitlementGuard } from './plan-entitlement.guard';

class Routes {
  @RequirePlanFeature('importExport')
  plain() {}

  @RequirePlanFeature('importExport')
  @WaiveFeatureWhenReadOnly()
  exportLeads() {}
}

function contextFor(handler: () => void): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => Routes,
    switchToHttp: () => ({
      getRequest: () => ({ user: { tenantId: 'tenant-1' } }),
    }),
  } as unknown as ExecutionContext;
}

function build(readOnly: boolean) {
  const entitlements = {
    assertFeatureEnabled: jest
      .fn()
      .mockRejectedValue(new ForbiddenException('Not on your plan')),
  };
  const tenantAccess = {
    getCachedTenantAccessState: jest
      .fn()
      .mockResolvedValue({ readOnly, accessEndsAt: null }),
  };
  const guard = new PlanEntitlementGuard(
    new Reflector(),
    entitlements as never,
    tenantAccess as never,
  );
  return { guard, entitlements, tenantAccess };
}

describe('PlanEntitlementGuard', () => {
  it('requires the plan feature', async () => {
    const { guard } = build(false);
    await expect(
      guard.canActivate(contextFor(Routes.prototype.plain)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets a read-only workspace export without the feature', async () => {
    const { guard, entitlements } = build(true);
    await expect(
      guard.canActivate(contextFor(Routes.prototype.exportLeads)),
    ).resolves.toBe(true);
    expect(entitlements.assertFeatureEnabled).not.toHaveBeenCalled();
  });

  it('still requires the feature on a waived route when not read-only', async () => {
    const { guard } = build(false);
    await expect(
      guard.canActivate(contextFor(Routes.prototype.exportLeads)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('does not waive other routes for read-only workspaces', async () => {
    const { guard, tenantAccess } = build(true);
    await expect(
      guard.canActivate(contextFor(Routes.prototype.plain)),
    ).rejects.toThrow(ForbiddenException);
    expect(tenantAccess.getCachedTenantAccessState).not.toHaveBeenCalled();
  });
});
