import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AdminPermissionKey } from '@crmpro/shared';
import type { Request } from 'express';
import {
  ADMIN_ANY_PERMISSIONS_METADATA_KEY,
  ADMIN_PERMISSIONS_METADATA_KEY,
} from '../constants';
import { AdminPermissionsService } from '../services/admin-permissions.service';

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminPermissionsService: AdminPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAll = this.reflector.getAllAndOverride<
      AdminPermissionKey[] | undefined
    >(ADMIN_PERMISSIONS_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredAny = this.reflector.getAllAndOverride<
      AdminPermissionKey[] | undefined
    >(ADMIN_ANY_PERMISSIONS_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredAll?.length && !requiredAny?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const admin = request.admin;

    if (!admin) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (!request.permissionKeys) {
      request.permissionKeys =
        await this.adminPermissionsService.getPermissionKeysForAdmin(admin.id);
    }

    const keys = request.permissionKeys;

    if (requiredAll?.length) {
      const hasAll = requiredAll.every((permission) => keys.has(permission));
      if (!hasAll) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    if (requiredAny?.length) {
      const hasAny = requiredAny.some((permission) => keys.has(permission));
      if (!hasAny) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    return true;
  }
}
