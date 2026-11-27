import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TENANT_ROLE_NAMES } from '@crmpro/shared/bootstrap';
import {
  assertActorCanAssignRole,
  assertActorCanManageUser,
} from '../../../common/auth/utils/permission-escalation.util';
import { PermissionsService } from '../../../common/auth/services/permissions.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: PermissionsService,
  ) {}

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

  /**
   * Whoever changes, deactivates, resets or signs out another user must hold
   * every permission that user holds, and only an Owner may act on an Owner.
   * Without this, any role with user.manage could set an Owner's password and
   * sign in as them. Acting on yourself is governed by the endpoints' own
   * rules (assertNotSelf), not by this check.
   */
  async assertActorCanManageUser(
    tenantId: string,
    actorUserId: string,
    target: ResolvedUser,
  ): Promise<void> {
    if (actorUserId === target.id) {
      return;
    }

    const [actor, actorPermissionKeys, targetPermissionKeys] =
      await Promise.all([
        this.resolveUser(tenantId, actorUserId),
        this.permissionsService.getPermissionKeysForUser(actorUserId, tenantId),
        this.permissionsService.getPermissionKeysForRole(
          target.role.id,
          tenantId,
        ),
      ]);

    if (
      target.role.name === TENANT_ROLE_NAMES.owner &&
      actor.role.name !== TENANT_ROLE_NAMES.owner
    ) {
      throw new ForbiddenException('Only an Owner can manage another Owner');
    }

    assertActorCanManageUser(actorPermissionKeys, targetPermissionKeys);
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

  async assertActorCanAssignRole(
    tenantId: string,
    actorUserId: string,
    roleId: string,
  ): Promise<{ id: string; name: string; isSystem: boolean }> {
    const role = await this.assertRoleBelongsToTenant(tenantId, roleId);

    const [actorPermissionKeys, targetRolePermissionKeys] = await Promise.all([
      this.permissionsService.getPermissionKeysForUser(actorUserId, tenantId),
      this.permissionsService.getPermissionKeysForRole(roleId, tenantId),
    ]);

    assertActorCanAssignRole(actorPermissionKeys, targetRolePermissionKeys);

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
