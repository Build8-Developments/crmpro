import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { PermissionKey } from '@crmpro/shared/auth';
import type { AuthenticatedUser } from '../../../modules/auth/types/jwt-payload.type';
import { PermissionsService } from '../services/permissions.service';
import { LeadScopeService } from './lead-scope.service';
import type { LeadScope } from './lead-scope.types';

interface ScopedRequest {
  user?: AuthenticatedUser;
  permissionKeys?: Set<PermissionKey>;
  leadScope?: LeadScope;
}

const LeadScopeRequest = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ScopedRequest =>
    ctx.switchToHttp().getRequest<ScopedRequest>(),
);

/** Resolves (once per request) the lead scope of the authenticated user. */
@Injectable()
export class ResolveLeadScopePipe implements PipeTransform<
  ScopedRequest,
  Promise<LeadScope>
> {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly leadScopeService: LeadScopeService,
  ) {}

  async transform(request: ScopedRequest): Promise<LeadScope> {
    if (request.leadScope) return request.leadScope;

    const user = request.user;
    if (!user) throw new ForbiddenException('Insufficient permissions');

    request.permissionKeys ??=
      await this.permissionsService.getPermissionKeysForUser(
        user.id,
        user.tenantId,
      );
    request.leadScope = await this.leadScopeService.resolve(
      user,
      request.permissionKeys,
    );
    return request.leadScope;
  }
}

/**
 * The leads the current user may see. Use on every handler that reads or
 * changes lead data; pass it down to the service query.
 */
export const CurrentLeadScope = () =>
  LeadScopeRequest(undefined, ResolveLeadScopePipe);
