import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UserTokenType } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PasswordService } from '../../../common/security/password.service';
import { UserTokensService } from '../../../common/security/user-tokens.service';
import { TenantAccessService } from '../../../common/tenant-access/tenant-access.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { AUDIT_ENTITY_TYPES } from '../../audit/audit.constants';
import { MailService } from '../../mail/mail.service';
import { passwordResetEmail } from '../../mail/templates/auth-emails';
import {
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MINUTES,
  USER_AUDIT_ACTIONS,
} from '../../users/users.constants';

const INVALID_LINK_MESSAGE = 'This link is invalid or has expired';

/**
 * Self-service password reset and invitation acceptance. Responses never
 * reveal whether an email or token exists.
 */
@Injectable()
export class AccountRecoveryService {
  private readonly logger = new Logger(AccountRecoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokens: UserTokensService,
    private readonly mail: MailService,
    private readonly tenantAccess: TenantAccessService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  /** Always resolves; emails a reset link only for active, accessible accounts. */
  async requestPasswordReset(tenantSlug: string, email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        isActive: true,
        deletedAt: null,
        tenant: { slug: tenantSlug, deletedAt: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
        invitedAt: true,
        inviteAcceptedAt: true,
        tenant: { select: { name: true } },
      },
    });

    // Pending invitees must use their invitation link instead.
    if (!user || (user.invitedAt && !user.inviteAcceptedAt)) {
      return;
    }

    try {
      await this.tenantAccess.assertTenantAccessible(user.tenantId);
    } catch {
      return;
    }

    if (
      await this.tokens.issuedWithin(
        user.id,
        UserTokenType.PASSWORD_RESET,
        PASSWORD_RESET_COOLDOWN_MS,
      )
    ) {
      return;
    }

    const rawToken = await this.tokens.issue({
      tenantId: user.tenantId,
      userId: user.id,
      type: UserTokenType.PASSWORD_RESET,
      ttlMs: PASSWORD_RESET_TTL_MINUTES * 60_000,
    });

    const message = passwordResetEmail({
      name: user.name,
      workspaceName: user.tenant.name,
      url: this.mail.webUrl(
        `/reset-password?token=${encodeURIComponent(rawToken)}`,
      ),
      expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
    });

    await this.mail.send({ to: user.email, ...message });
    this.logger.log(`Password reset link sent for user ${user.id}`);
  }

  async resetPassword(rawToken: string, password: string): Promise<void> {
    const passwordHash = await this.passwordService.hash(password);

    await this.prisma.$transaction(async (tx) => {
      const token = await this.tokens.consume(
        rawToken,
        UserTokenType.PASSWORD_RESET,
        tx,
      );

      if (!token) {
        throw new BadRequestException(INVALID_LINK_MESSAGE);
      }

      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      });

      // A reset must sign out whoever might hold the old password.
      const revoked = await tx.userSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditWriter.createAuditLog({
        tenantId: token.tenantId,
        actorUserId: token.userId,
        action: USER_AUDIT_ACTIONS.PASSWORD_RESET_SELF,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: token.userId,
        metadata: { revokedSessions: revoked.count },
        tx,
      });
    });
  }

  /** Details shown on the accept-invite page before the password is set. */
  async getInvitation(rawToken: string) {
    const token = await this.tokens.peek(rawToken, UserTokenType.INVITE);

    if (!token) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: token.userId, deletedAt: null },
      select: {
        name: true,
        email: true,
        tenant: { select: { name: true, slug: true } },
      },
    });

    if (!user) {
      throw new BadRequestException(INVALID_LINK_MESSAGE);
    }

    return {
      name: user.name,
      email: user.email,
      workspaceName: user.tenant.name,
      workspaceSlug: user.tenant.slug,
    };
  }

  async acceptInvitation(
    rawToken: string,
    password: string,
  ): Promise<{ email: string; workspaceSlug: string }> {
    const passwordHash = await this.passwordService.hash(password);

    return this.prisma.$transaction(async (tx) => {
      const token = await this.tokens.consume(
        rawToken,
        UserTokenType.INVITE,
        tx,
      );

      if (!token) {
        throw new BadRequestException(INVALID_LINK_MESSAGE);
      }

      const user = await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, inviteAcceptedAt: new Date() },
        select: { email: true, tenant: { select: { slug: true } } },
      });

      await this.auditWriter.createAuditLog({
        tenantId: token.tenantId,
        actorUserId: token.userId,
        action: USER_AUDIT_ACTIONS.INVITE_ACCEPTED,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: token.userId,
        tx,
      });

      return { email: user.email, workspaceSlug: user.tenant.slug };
    });
  }
}
