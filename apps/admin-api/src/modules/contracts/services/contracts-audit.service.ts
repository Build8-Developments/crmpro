import { Injectable } from '@nestjs/common';
import { AdminActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { RequestSecurityMetadata } from '../../auth/auth.types';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class ContractsAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logContractCreated(
    actorAdminId: string,
    contractId: string,
    metadata: RequestSecurityMetadata,
    details: Record<string, unknown>,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'CONTRACT_CREATED',
        entityType: 'TenantContract',
        entityId: contractId,
        metadata: { ...metadata, ...details },
      },
      tx,
    );
  }

  async logContractUpdated(
    actorAdminId: string,
    contractId: string,
    metadata: RequestSecurityMetadata,
    changes: Record<string, unknown>,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'CONTRACT_UPDATED',
        entityType: 'TenantContract',
        entityId: contractId,
        metadata: { ...metadata, changes },
      },
      tx,
    );
  }

  async logContractActivated(
    actorAdminId: string,
    contractId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'CONTRACT_ACTIVATED',
        entityType: 'TenantContract',
        entityId: contractId,
        metadata,
      },
      tx,
    );
  }

  async logContractTerminated(
    actorAdminId: string,
    contractId: string,
    metadata: RequestSecurityMetadata,
    details: Record<string, unknown> = {},
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'CONTRACT_TERMINATED',
        entityType: 'TenantContract',
        entityId: contractId,
        metadata: { ...metadata, ...details },
      },
      tx,
    );
  }

  /** IMMEDIATE termination suspends the tenant: same action as a manual suspension. */
  async logTenantSuspendedByTermination(
    actorAdminId: string,
    tenantId: string,
    metadata: RequestSecurityMetadata,
    details: { contractId: string; revokedSessions: number },
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'TENANT_SUSPENDED',
        entityType: 'Tenant',
        entityId: tenantId,
        metadata: { ...metadata, ...details, cause: 'CONTRACT_TERMINATED' },
      },
      tx,
    );
  }

  async logContractArchived(
    actorAdminId: string,
    contractId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'CONTRACT_ARCHIVED',
        entityType: 'TenantContract',
        entityId: contractId,
        metadata,
      },
      tx,
    );
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
