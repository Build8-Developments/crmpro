import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PermissionKey } from '@crmpro/shared/auth';

/**
 * Permission keys loaded by PermissionsGuard for this request. Only valid on
 * handlers that declare @RequirePermission (the guard skips loading otherwise);
 * falls back to an empty set so callers fail closed.
 */
export const CurrentPermissionKeys = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ReadonlySet<PermissionKey> => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ permissionKeys?: Set<PermissionKey> }>();

    return request.permissionKeys ?? new Set<PermissionKey>();
  },
);
