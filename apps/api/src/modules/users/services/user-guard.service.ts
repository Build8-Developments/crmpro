import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TENANT_ROLE_NAMES } from '@crmpro/shared/bootstrap';
import { PrismaService } from '../../../common/prisma/prisma.service';

type ResolvedUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  isActive: boolean;
  role: {
    id: string;
    name: string;
    tenantId: string;
  };
};

@Injectable()
export class UserGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUser(tenantId: string, userId: string): Promise<ResolvedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
            tenantId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!user || user.role.deletedAt !== null) {
      throw new NotFoundException('User not found');
    }

    if (user.role.tenantId !== tenantId) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      role: {
        id: user.role.id,
        name: user.role.name,
        tenantId: user.role.tenantId,
      },
    };
  }

  assertNotSelf(actorUserId: string, targetUserId: string): void {
    if (actorUserId === targetUserId) {
      throw new BadRequestException(
        'You cannot perform this action on yourself',
      );
    }
  }

  async assertRoleBelongsToTenant(
    tenantId: string,
    roleId: string,
  ): Promise<{ id: string; name: string; isSystem: boolean }> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId, deletedAt: null },
      select: { id: true, name: true, isSystem: true },
    });

    if (!role) {
      throw new BadRequestException('Role not found for this tenant');
    }

    return role;
  }

  async assertNotLastOwner(tenantId: string, userId: string): Promise<void> {
    const user = await this.resolveUser(tenantId, userId);
    const isOwner = user.role.name === TENANT_ROLE_NAMES.owner;

    if (!isOwner || !user.isActive) {
      return;
    }

    await this.assertAnotherActiveOwnerExists(tenantId, userId);
  }

  async assertOwnerRoleChangeAllowed(
    tenantId: string,
    userId: string,
    newRoleName: string,
  ): Promise<void> {
    const user = await this.resolveUser(tenantId, userId);

    if (
      user.role.name === TENANT_ROLE_NAMES.owner &&
      newRoleName !== TENANT_ROLE_NAMES.owner &&
      user.isActive
    ) {
      await this.assertAnotherActiveOwnerExists(tenantId, userId);
    }
  }

  private async assertAnotherActiveOwnerExists(
    tenantId: string,
    excludeUserId: string,
  ): Promise<void> {
    const otherOwners = await this.prisma.user.count({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        id: { not: excludeUserId },
        role: { name: TENANT_ROLE_NAMES.owner, deletedAt: null },
      },
    });

    if (otherOwners === 0) {
      throw new BadRequestException(
        'Tenant must always have at least one active Owner',
      );
    }
  }
}
