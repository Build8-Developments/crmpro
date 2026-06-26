import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionKey } from '@crmpro/shared/auth';
import type { AuthenticatedUser } from '../../../modules/auth/types/jwt-payload.type';
import { PERMISSIONS_METADATA_KEY } from '../constants';
import { PermissionsService } from '../services/permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      PermissionKey[] | undefined
    >(PERMISSIONS_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      permissionKeys?: Set<PermissionKey>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (!request.permissionKeys) {
      request.permissionKeys =
        await this.permissionsService.getPermissionKeysForUser(
          user.id,
          user.tenantId,
        );
    }

    const hasAll = requiredPermissions.every((permission) =>
      request.permissionKeys!.has(permission),
    );

    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
