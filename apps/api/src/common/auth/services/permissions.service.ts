import { Injectable } from '@nestjs/common';
import type { PermissionKey } from '@crmpro/shared/auth';
import { PrismaService } from '../../prisma/prisma.service';

export interface UserAuthorization {
  permissions: PermissionKey[];
  role: {
    id: string;
    name: string;
  } | null;
}

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserAuthorization(
    userId: string,
    tenantId: string,
  ): Promise<UserAuthorization> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        tenantId: true,
        role: {
          select: {
            id: true,
            name: true,
            tenantId: true,
            permissions: {
              select: {
                permission: {
                  select: { key: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.role || user.role.tenantId !== user.tenantId) {
      return { permissions: [], role: null };
    }

    const permissions = user.role.permissions.map(
      (rolePermission) => rolePermission.permission.key,
    ) as PermissionKey[];

    return {
      permissions,
      role: {
        id: user.role.id,
        name: user.role.name,
      },
    };
  }

  async getPermissionKeysForUser(
    userId: string,
    tenantId: string,
  ): Promise<Set<PermissionKey>> {
    const { permissions } = await this.getUserAuthorization(userId, tenantId);
    return new Set(permissions);
  }

  async getPermissionKeysForRole(
    roleId: string,
    tenantId: string,
  ): Promise<PermissionKey[]> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId, deletedAt: null },
      select: {
        permissions: {
          select: {
            permission: {
              select: { key: true },
            },
          },
        },
      },
    });

    if (!role) {
      return [];
    }

    return role.permissions.map(
      (rolePermission) => rolePermission.permission.key,
    ) as PermissionKey[];
  }
}
