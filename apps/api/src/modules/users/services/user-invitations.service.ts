import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserTokenType } from '@crmpro/database';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { QuotaService } from '../../../common/quota/quota.service';
import { PasswordService } from '../../../common/security/password.service';
import { UserTokensService } from '../../../common/security/user-tokens.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { AUDIT_ENTITY_TYPES } from '../../audit/audit.constants';
import { MailService } from '../../mail/mail.service';
import { inviteEmail } from '../../mail/templates/auth-emails';
import { InviteUserDto } from '../dto/invite-user.dto';
import type { UserListItem } from '../types/user.types';
import {
  INVITE_RESEND_COOLDOWN_MS,
  INVITE_TTL_DAYS,
  USER_AUDIT_ACTIONS,
} from '../users.constants';
import { toUserListItem, userListSelectClause } from '../utils/user.mapper';
import { UserGuardService } from './user-guard.service';

/**
 * Email invitations: the user is created with an unusable random password and
 * activates their account by choosing one through the emailed link.
 */
@Injectable()
export class UserInvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly quotaService: QuotaService,
    private readonly userGuardService: UserGuardService,
    private readonly tokens: UserTokensService,
    private readonly mail: MailService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async inviteUser(
    tenantId: string,
    actorUserId: string,
    dto: InviteUserDto,
  ): Promise<UserListItem> {
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: { equals: dto.email, mode: 'insensitive' },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    await this.userGuardService.assertActorCanAssignRole(
      tenantId,
      actorUserId,
      dto.roleId,
    );

    if (dto.teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: dto.teamId, tenantId, deletedAt: null },
        select: { id: true },
      });
      if (!team) {
        throw new BadRequestException('Team not found');
      }
    }

    // Nobody knows this password; the invite link replaces it.
    const placeholderHash = await this.passwordService.hash(
      randomBytes(32).toString('base64url'),
    );

    const { user, rawToken } = await this.prisma
      .$transaction(async (tx) => {
        await this.quotaService.assertCanCreateUserInTransaction(tx, tenantId);

        const created = await tx.user.create({
          data: {
            tenantId,
            roleId: dto.roleId,
            teamId: dto.teamId ?? null,
            name: dto.fullName,
            email: dto.email,
            passwordHash: placeholderHash,
            isActive: true,
            invitedAt: new Date(),
          },
          select: userListSelectClause,
        });

        const token = await this.tokens.issue({
          tenantId,
          userId: created.id,
          type: UserTokenType.INVITE,
          ttlMs: INVITE_TTL_DAYS * 86_400_000,
          tx,
        });

        await this.auditWriter.createAuditLog({
          tenantId,
          actorUserId,
          action: USER_AUDIT_ACTIONS.INVITED,
          entityType: AUDIT_ENTITY_TYPES.USER,
          entityId: created.id,
          metadata: { email: created.email, roleId: dto.roleId },
          tx,
        });

        return { user: created, rawToken: token };
      })
      .catch((error: unknown) => {
        // Raced with another invite/create for the same address.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('A user with this email already exists');
        }
        throw error;
      });

    await this.sendInvite(tenantId, actorUserId, user.id, rawToken);
    return toUserListItem(user);
  }

  async resendInvite(
    tenantId: string,
    actorUserId: string,
    userId: string,
  ): Promise<{ id: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, invitedAt: true, inviteAcceptedAt: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.invitedAt || user.inviteAcceptedAt) {
      throw new BadRequestException('This user has no pending invitation');
    }
    if (
      await this.tokens.issuedWithin(
        user.id,
        UserTokenType.INVITE,
        INVITE_RESEND_COOLDOWN_MS,
      )
    ) {
      throw new BadRequestException(
        'The invitation was just sent. Wait a couple of minutes before resending.',
      );
    }

    const rawToken = await this.prisma.$transaction(async (tx) => {
      const token = await this.tokens.issue({
        tenantId,
        userId: user.id,
        type: UserTokenType.INVITE,
        ttlMs: INVITE_TTL_DAYS * 86_400_000,
        tx,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: USER_AUDIT_ACTIONS.INVITE_RESENT,
        entityType: AUDIT_ENTITY_TYPES.USER,
        entityId: user.id,
        tx,
      });

      return token;
    });

    await this.sendInvite(tenantId, actorUserId, user.id, rawToken);
    return { id: user.id };
  }

  private async sendInvite(
    tenantId: string,
    actorUserId: string,
    userId: string,
    rawToken: string,
  ): Promise<void> {
    const [user, actor] = await Promise.all([
      this.prisma.user.findFirstOrThrow({
        where: { id: userId, tenantId },
        select: {
          name: true,
          email: true,
          tenant: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.user.findFirst({
        where: { id: actorUserId, tenantId },
        select: { name: true },
      }),
    ]);

    const message = inviteEmail({
      name: user.name,
      inviterName: actor?.name ?? user.tenant.name,
      workspaceName: user.tenant.name,
      url: this.mail.workspaceUrl(
        user.tenant.slug,
        `/accept-invite?token=${encodeURIComponent(rawToken)}`,
      ),
      expiresInDays: INVITE_TTL_DAYS,
    });

    await this.mail.send({ to: user.email, ...message });
  }
}
