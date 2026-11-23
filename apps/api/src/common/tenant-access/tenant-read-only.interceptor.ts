import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { from, switchMap, type Observable } from 'rxjs';
import { TenantReadOnlyException } from './tenant-access.exception';
import { TenantAccessService } from './tenant-access.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Writes a read-only workspace may still make: signing in and out, password
 * reset/change, reading data behind a POST (unlocking a folder, revealing a
 * contact), exporting, and clearing notifications. Matched on the route
 * pattern, without the global prefix.
 */
export const READ_ONLY_ALLOWED_ROUTES: ReadonlySet<string> = new Set([
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /auth/logout',
  'POST /auth/logout-all',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
  'POST /auth/invitations/peek',
  'POST /me/password',
  'POST /export-jobs/leads',
  'PATCH /notifications/read-all',
  'PATCH /notifications/:id/read',
  'POST /files/folders/:id/unlock',
  'POST /files/folders/:id/lock',
  'POST /leads/:id/contact-access',
  // Support stays open so a read-only workspace can ask to renew.
  'POST /support/conversations',
  'POST /support/conversations/:id/messages',
]);

const GLOBAL_PREFIX = /^\/api\/v1(?=\/|$)/;

type TenantScopedRequest = Request & {
  user?: { tenantId?: string };
  apiKey?: { tenantId?: string };
};

/**
 * Refuses changes (POST/PUT/PATCH/DELETE) from tenants whose contract was
 * terminated in READ_ONLY mode, with 403 TENANT_READ_ONLY.
 *
 * An interceptor rather than a guard: global guards run before the route's
 * auth guard, interceptors after it, so the tenant (JWT user or API key) is
 * known here. Unauthenticated routes carry no tenant and pass through.
 */
@Injectable()
export class TenantReadOnlyInterceptor implements NestInterceptor {
  constructor(private readonly tenantAccess: TenantAccessService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<TenantScopedRequest>();

    if (!MUTATING_METHODS.has(request.method) || isAllowedRoute(request)) {
      return next.handle();
    }

    const tenantId = request.user?.tenantId ?? request.apiKey?.tenantId;
    if (!tenantId) {
      return next.handle();
    }

    return from(this.tenantAccess.getCachedTenantAccessState(tenantId)).pipe(
      switchMap((state) => {
        if (state.readOnly) {
          throw new TenantReadOnlyException(state.accessEndsAt);
        }
        return next.handle();
      }),
    );
  }
}

function isAllowedRoute(request: Request): boolean {
  const pattern = (request.route as { path?: unknown } | undefined)?.path;
  if (typeof pattern !== 'string') {
    return false;
  }

  const path = pattern.replace(GLOBAL_PREFIX, '') || '/';
  return READ_ONLY_ALLOWED_ROUTES.has(`${request.method} ${path}`);
}
