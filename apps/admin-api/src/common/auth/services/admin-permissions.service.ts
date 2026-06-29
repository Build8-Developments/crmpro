import { Injectable } from '@nestjs/common';
import type { AdminPermissionKey } from '@crmpro/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface AdminAuthorization {
  permissions: AdminPermissionKey[];
  role: {
    id: string;
    name: string;
  } | null;
}

@Injectable()
export class AdminPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminAuthorization(adminId: string): Promise<AdminAuthorization> {
    const admin = await this.prisma.platformAdmin.findFirst({
      where: {
        id: adminId,
        isActive: true,
      },
      select: {
        role: {
          select: {
            id: true,
            name: true,
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

    if (!admin?.role) {
      return { permissions: [], role: null };
    }

    const permissions = admin.role.permissions.map(
      ({ permission }) => permission.key as AdminPermissionKey,
    );

    return {
      permissions,
      role: {
        id: admin.role.id,
        name: admin.role.name,
      },
    };
  }

  async getPermissionKeysForAdmin(
    adminId: string,
  ): Promise<Set<AdminPermissionKey>> {
    const { permissions } = await this.getAdminAuthorization(adminId);
    return new Set(permissions);
  }
}
