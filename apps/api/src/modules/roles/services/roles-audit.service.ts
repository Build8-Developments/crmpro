import { Injectable } from '@nestjs/common';
import { AuditActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ROLE_AUDIT_ACTIONS } from '../roles.constants';

type AuditTx = Prisma.TransactionClient;

@Injectable()
export class RolesAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logRoleCreated(
    tenantId: string,
    actorUserId: string,
    roleId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      roleId,
      ROLE_AUDIT_ACTIONS.CREATED,
      metadata,
      tx,
    );
  }

  async logRoleUpdated(
    tenantId: string,
    actorUserId: string,
    roleId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      roleId,
      ROLE_AUDIT_ACTIONS.UPDATED,
      metadata,
      tx,
    );
  }

  async logRolePermissionsUpdated(
    tenantId: string,
    actorUserId: string,
    roleId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      roleId,
      ROLE_AUDIT_ACTIONS.PERMISSIONS_UPDATED,
      metadata,
      tx,
    );
  }

  async logRoleArchived(
    tenantId: string,
    actorUserId: string,
    roleId: string,
    metadata: Record<string, unknown>,
    tx?: AuditTx,
  ): Promise<void> {
    await this.write(
      tenantId,
      actorUserId,
      roleId,
      ROLE_AUDIT_ACTIONS.ARCHIVED,
      metadata,
      tx,
    );
  }

  private async write(
    tenantId: string,
    actorUserId: string,
    roleId: string,
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
        entityType: 'Role',
        entityId: roleId,
        action,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
