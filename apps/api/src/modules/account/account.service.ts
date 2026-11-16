import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordService } from '../../common/security/password.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { SanitizedUser } from '../auth/types/sanitized-user.type';
import { ACCOUNT_AUDIT_ACTIONS } from './account.constants';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';

const accountUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  role: { select: { id: true, name: true } },
  tenant: { select: { id: true, name: true, slug: true, status: true } },
} as const;

/**
 * Self-service operations on the signed-in user's own account. These never
 * require user-management permissions: every user may edit themselves.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async updateMe(
    authUser: AuthenticatedUser,
    dto: UpdateMeDto,
  ): Promise<SanitizedUser> {
    const data: { name?: string; phone?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: authUser.id, tenantId: authUser.tenantId },
        data,
        select: accountUserSelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId: authUser.tenantId,
        actorUserId: authUser.id,
        action: ACCOUNT_AUDIT_ACTIONS.PROFILE_UPDATED,
        entityType: 'User',
        entityId: authUser.id,
        metadata: { fields: Object.keys(data) },
        tx,
      });

      return user;
    });
  }

  /**
   * Changes the user's own password after verifying the current one, then
   * signs out every other session (the current device stays signed in).
   */
  async changePassword(
    authUser: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<{ revokedSessions: number }> {
    const user = await this.prisma.user.findFirst({
      where: { id: authUser.id, tenantId: authUser.tenantId, deletedAt: null },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid authentication session');
    }

    const valid = await this.passwordService.verify(
      user.passwordHash,
      dto.currentPassword,
    );
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: authUser.id },
        data: { passwordHash },
      });

      const revoked = await tx.userSession.updateMany({
        where: {
          userId: authUser.id,
          revokedAt: null,
          id: { not: authUser.sessionId },
        },
        data: { revokedAt: new Date() },
      });

      await this.auditWriter.createAuditLog({
        tenantId: authUser.tenantId,
        actorUserId: authUser.id,
        action: ACCOUNT_AUDIT_ACTIONS.PASSWORD_CHANGED,
        entityType: 'User',
        entityId: authUser.id,
        metadata: { revokedOtherSessions: revoked.count },
        tx,
      });

      return { revokedSessions: revoked.count };
    });
  }
}
