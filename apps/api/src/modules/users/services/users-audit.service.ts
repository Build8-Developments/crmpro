import { Injectable } from '@nestjs/common';
import { AuditActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { USER_AUDIT_ACTIONS } from '../users.constants';

type AuditTx = Prisma.TransactionClient;

@Injectable()
export class UsersAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logUserCreated(
    tenantId: string,
    actorUserId: string,
    userId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      userId,
      USER_AUDIT_ACTIONS.CREATED,
      metadata,
      tx,
    );
  }

  async logUserUpdated(
    tenantId: string,
    actorUserId: string,
    userId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      userId,
      USER_AUDIT_ACTIONS.UPDATED,
      metadata,
      tx,
    );
  }

  async logUserRoleChanged(
    tenantId: string,
    actorUserId: string,
    userId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      userId,
      USER_AUDIT_ACTIONS.ROLE_CHANGED,
      metadata,
      tx,
    );
  }

  async logUserDeactivated(
    tenantId: string,
    actorUserId: string,
    userId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      userId,
      USER_AUDIT_ACTIONS.DEACTIVATED,
      metadata,
      tx,
    );
  }

  async logUserReactivated(
    tenantId: string,
    actorUserId: string,
    userId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      userId,
      USER_AUDIT_ACTIONS.REACTIVATED,
      metadata,
      tx,
    );
  }

  async logUserPasswordReset(
    tenantId: string,
    actorUserId: string,
    userId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      userId,
      USER_AUDIT_ACTIONS.PASSWORD_RESET,
      metadata,
      tx,
    );
  }

  async logUserSessionsRevoked(
    tenantId: string,
    actorUserId: string,
    userId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      userId,
      USER_AUDIT_ACTIONS.SESSIONS_REVOKED,
      metadata,
      tx,
    );
  }

  private async write(
    tenantId: string,
    actorUserId: string,
    userId: string,
    action: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    const client = tx ?? this.prisma;

    await client.auditLog.create({
      data: {
        tenantId,
        actorType: AuditActorType.USER,
        actorUserId,
        entityType: 'User',
        entityId: userId,
        action,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
