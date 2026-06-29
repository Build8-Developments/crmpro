import { Injectable } from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { AUDIT_ENTITY_TYPES } from '../../audit/audit.constants';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { USER_AUDIT_ACTIONS } from '../users.constants';

type AuditTx = Prisma.TransactionClient;

@Injectable()
export class UsersAuditService {
  constructor(private readonly auditWriter: AuditWriterService) {}

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
    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.USER,
      entityId: userId,
      metadata,
      tx,
    });
  }
}
