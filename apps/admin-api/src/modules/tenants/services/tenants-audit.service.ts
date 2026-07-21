import { Injectable } from '@nestjs/common';
import { AdminActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { RequestSecurityMetadata } from '../../auth/auth.types';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class TenantsAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logTenantCreated(
    actorAdminId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
    details: { contractId: string; ownerEmail: string },
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'TENANT_CREATED',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: { ...metadata, ...details },
      },
      tx,
    );
  }

  async logTenantSuspended(
    actorAdminId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
    revokedSessions: number,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'TENANT_SUSPENDED',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: { ...metadata, revokedSessions },
      },
      tx,
    );
  }

  async logTenantReactivated(
    actorAdminId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'TENANT_REACTIVATED',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata,
      },
      tx,
    );
  }

  async logTenantUpdated(
    actorAdminId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
    changedFields: string[],
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'TENANT_UPDATED',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: { ...metadata, changedFields },
      },
      tx,
    );
  }

  async logOwnerUpdated(
    actorAdminId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
    changedFields: string[],
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'OWNER_UPDATED',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: { ...metadata, changedFields },
      },
      tx,
    );
  }

  async logOwnerPasswordReset(
    actorAdminId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
    revokedSessions: number,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'OWNER_PASSWORD_RESET',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: { ...metadata, revokedSessions },
      },
      tx,
    );
  }

  async logOwnerSessionsRevoked(
    actorAdminId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
    revokedSessions: number,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'OWNER_SESSIONS_REVOKED',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: { ...metadata, revokedSessions },
      },
      tx,
    );
  }

  async logTenantNoteCreated(
    actorAdminId: string,
    noteId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<void> {
    await this.write({
      actorAdminId,
      action: 'TENANT_NOTE_CREATED',
      entityType: 'TenantNote',
      entityId: noteId,
      metadata: { ...metadata, tenantId },
    });
  }

  async logTenantNoteUpdated(
    actorAdminId: string,
    noteId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<void> {
    await this.write({
      actorAdminId,
      action: 'TENANT_NOTE_UPDATED',
      entityType: 'TenantNote',
      entityId: noteId,
      metadata: { ...metadata, tenantId },
    });
  }

  async logTenantNoteDeleted(
    actorAdminId: string,
    noteId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
  ): Promise<void> {
    await this.write({
      actorAdminId,
      action: 'TENANT_NOTE_DELETED',
      entityType: 'TenantNote',
      entityId: noteId,
      metadata: { ...metadata, tenantId },
    });
  }

  private async write(
    input: {
      actorAdminId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata: RequestSecurityMetadata | Record<string, unknown>;
    },
    tx?: PrismaTx,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const { metadata, ...data } = input;

    await client.adminAuditLog.create({
      data: {
        actorType: AdminActorType.ADMIN,
        ...data,
        ipAddress: (metadata.ipAddress as string | null | undefined) ?? null,
        userAgent: (metadata.userAgent as string | null | undefined) ?? null,
        fingerprint:
          (metadata.fingerprint as string | null | undefined) ?? null,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
