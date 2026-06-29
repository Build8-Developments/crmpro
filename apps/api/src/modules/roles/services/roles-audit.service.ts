import { Injectable } from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { AUDIT_ENTITY_TYPES } from '../../audit/audit.constants';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { ROLE_AUDIT_ACTIONS } from '../roles.constants';

type AuditTx = Prisma.TransactionClient;

@Injectable()
export class RolesAuditService {
  constructor(private readonly auditWriter: AuditWriterService) {}

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
    await this.auditWriter.createAuditLog({
      tenantId,
      actorUserId,
      action,
      entityType: AUDIT_ENTITY_TYPES.ROLE,
      entityId: roleId,
      metadata,
      tx,
    });
  }
}
