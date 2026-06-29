import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { PasswordService } from '../../common/security/password.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  buildPaginatedResponse,
  getPaginationParams,
} from '../../common/pagination/utils/pagination.util';
import type { PaginatedResponse } from '../../common/pagination/types/paginated-response.type';
import type { RequestSecurityMetadata } from '../auth/auth.types';
import { AdminSecurityService } from '../auth/services/admin-security.service';
import { AdminSessionService } from '../auth/services/admin-session.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { GetAdminsQueryDto } from './dto/get-admins-query.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AdminsAuditService } from './services/admins-audit.service';
import type {
  AdminDetail,
  AdminListItem,
  AdminRoleDetail,
} from './types/admin.types';
import {
  toAdminDetail,
  toAdminListItem,
  toAdminRoleDetail,
} from './utils/admin.mapper';

const SUPER_ADMIN_ROLE_NAME = 'SUPER_ADMIN';

const adminWithRoleInclude = {
  role: true,
} satisfies Prisma.PlatformAdminInclude;

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: AdminSessionService,
    private readonly securityService: AdminSecurityService,
    private readonly auditService: AdminsAuditService,
  ) {}

  async listAdmins(
    query: GetAdminsQueryDto,
  ): Promise<PaginatedResponse<AdminListItem>> {
    const { page, limit, skip, take } = getPaginationParams(query);

    const where: Prisma.PlatformAdminWhereInput = {
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              {
                email: { contains: query.search, mode: 'insensitive' },
              },
              {
                fullName: { contains: query.search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
    };

    const [totalItems, admins] = await this.prisma.$transaction([
      this.prisma.platformAdmin.count({ where }),
      this.prisma.platformAdmin.findMany({
        where,
        include: adminWithRoleInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return buildPaginatedResponse(
      admins.map(toAdminListItem),
      page,
      limit,
      totalItems,
    );
  }

  async getAdminById(id: string): Promise<AdminDetail> {
    const admin = await this.findAdminOrThrow(id);
    const activeSessionsCount = await this.countActiveSessions(id);
    return toAdminDetail(admin, activeSessionsCount);
  }

  async createAdmin(
    dto: CreateAdminDto,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<AdminDetail> {
    await this.assertEmailAvailable(dto.email);
    await this.assertRoleExists(dto.roleId);

    const passwordHash = await this.passwordService.hash(dto.password);

    const admin = await this.prisma.platformAdmin.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        roleId: dto.roleId,
        isActive: true,
      },
      include: adminWithRoleInclude,
    });

    await this.auditService.logAdminCreated(actorAdminId, admin.id, metadata, {
      email: admin.email,
      roleId: admin.roleId,
    });

    return toAdminDetail(admin, 0);
  }

  async updateAdmin(
    id: string,
    dto: UpdateAdminDto,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<AdminDetail> {
    const existing = await this.findAdminOrThrow(id);

    if (dto.email && dto.email !== existing.email) {
      await this.assertEmailAvailable(dto.email, id);
    }

    if (dto.roleId) {
      await this.assertRoleExists(dto.roleId);
    }

    const admin = await this.prisma.platformAdmin.update({
      where: { id },
      data: {
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.roleId !== undefined ? { roleId: dto.roleId } : {}),
      },
      include: adminWithRoleInclude,
    });

    const changes: Record<string, unknown> = {};
    if (dto.email !== undefined && dto.email !== existing.email) {
      changes.email = dto.email;
    }
    if (dto.fullName !== undefined && dto.fullName !== existing.fullName) {
      changes.fullName = dto.fullName;
    }
    if (dto.roleId !== undefined && dto.roleId !== existing.roleId) {
      changes.roleId = dto.roleId;
    }

    await this.auditService.logAdminUpdated(
      actorAdminId,
      id,
      metadata,
      changes,
    );

    const activeSessionsCount = await this.countActiveSessions(id);
    return toAdminDetail(admin, activeSessionsCount);
  }

  async deactivateAdmin(
    id: string,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<AdminDetail> {
    if (id === actorAdminId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    const admin = await this.findAdminOrThrow(id);

    if (!admin.isActive) {
      throw new BadRequestException('Admin is already inactive');
    }

    if (admin.role.name === SUPER_ADMIN_ROLE_NAME) {
      await this.assertNotLastActiveSuperAdmin(id);
    }

    const revokedCount = await this.prisma.$transaction(async (tx) => {
      await tx.platformAdmin.update({
        where: { id },
        data: { isActive: false },
      });

      const count = await tx.adminSession.updateMany({
        where: { adminId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.logAdminDeactivated(
        actorAdminId,
        id,
        metadata,
        tx,
      );

      return count.count;
    });

    if (revokedCount > 0) {
      await this.securityService.logSessionRevoked(id, {
        ...metadata,
        revokedCount,
      } as RequestSecurityMetadata);
    }

    const updated = await this.findAdminOrThrow(id);
    return toAdminDetail(updated, 0);
  }

  async reactivateAdmin(
    id: string,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<AdminDetail> {
    const admin = await this.findAdminOrThrow(id);

    if (admin.isActive) {
      throw new BadRequestException('Admin is already active');
    }

    const updated = await this.prisma.platformAdmin.update({
      where: { id },
      data: { isActive: true },
      include: adminWithRoleInclude,
    });

    await this.auditService.logAdminReactivated(actorAdminId, id, metadata);

    const activeSessionsCount = await this.countActiveSessions(id);
    return toAdminDetail(updated, activeSessionsCount);
  }

  async listRoles(): Promise<AdminRoleDetail[]> {
    const roles = await this.prisma.adminRole.findMany({
      include: {
        permissions: {
          include: { permission: true },
          orderBy: { permission: { key: 'asc' } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map(toAdminRoleDetail);
  }

  async getRoleById(id: string): Promise<AdminRoleDetail> {
    const role = await this.prisma.adminRole.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
          orderBy: { permission: { key: 'asc' } },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return toAdminRoleDetail(role);
  }

  async revokeSessions(
    id: string,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<{ revokedCount: number }> {
    await this.findAdminOrThrow(id);

    const revokedCount = await this.sessionService.revokeAllSessions(id);

    await this.auditService.logSessionsRevoked(
      actorAdminId,
      id,
      metadata,
      revokedCount,
    );

    if (revokedCount > 0) {
      await this.securityService.logSessionRevoked(id, {
        ...metadata,
        revokedCount,
      } as RequestSecurityMetadata);
    }

    return { revokedCount };
  }

  async resetPassword(
    id: string,
    dto: ResetAdminPasswordDto,
    actorAdminId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<{ success: true }> {
    await this.findAdminOrThrow(id);

    const passwordHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.platformAdmin.update({
        where: { id },
        data: { passwordHash },
      });

      await tx.adminSession.updateMany({
        where: { adminId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.logPasswordReset(actorAdminId, id, metadata, tx);
    });

    await this.securityService.logPasswordChanged(id, metadata);

    return { success: true };
  }

  private async findAdminOrThrow(id: string) {
    const admin = await this.prisma.platformAdmin.findFirst({
      where: { id },
      include: adminWithRoleInclude,
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return admin;
  }

  private async assertEmailAvailable(
    email: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.platformAdmin.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Email is already in use');
    }
  }

  private async assertRoleExists(roleId: string): Promise<void> {
    const role = await this.prisma.adminRole.findUnique({
      where: { id: roleId },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }
  }

  private async assertNotLastActiveSuperAdmin(adminId: string): Promise<void> {
    const count = await this.prisma.platformAdmin.count({
      where: {
        isActive: true,
        role: { name: SUPER_ADMIN_ROLE_NAME },
        id: { not: adminId },
      },
    });

    if (count === 0) {
      throw new BadRequestException(
        'Cannot deactivate the last active super admin',
      );
    }
  }

  private async countActiveSessions(adminId: string): Promise<number> {
    const now = new Date();
    return this.prisma.adminSession.count({
      where: {
        adminId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });
  }
}
