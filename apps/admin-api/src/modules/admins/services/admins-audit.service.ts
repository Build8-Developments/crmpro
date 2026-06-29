import { Injectable } from '@nestjs/common';
import { AdminActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { RequestSecurityMetadata } from '../../auth/auth.types';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class AdminsAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAdminCreated(
    actorAdminId: string,
    targetAdminId: string,
    metadata: RequestSecurityMetadata,
    details: { email: string; roleId: string },
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_CREATED',
        entityType: 'PlatformAdmin',
        entityId: targetAdminId,
        metadata: { ...metadata, ...details },
      },
      tx,
    );
  }

  async logAdminUpdated(
    actorAdminId: string,
    targetAdminId: string,
    metadata: RequestSecurityMetadata,
    changes: Record<string, unknown>,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_UPDATED',
        entityType: 'PlatformAdmin',
        entityId: targetAdminId,
        metadata: { ...metadata, changes },
      },
      tx,
    );
  }

  async logAdminDeactivated(
    actorAdminId: string,
    targetAdminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_DEACTIVATED',
        entityType: 'PlatformAdmin',
        entityId: targetAdminId,
        metadata,
      },
      tx,
    );
  }

  async logAdminReactivated(
    actorAdminId: string,
    targetAdminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_REACTIVATED',
        entityType: 'PlatformAdmin',
        entityId: targetAdminId,
        metadata,
      },
      tx,
    );
  }

  async logNoteCreated(
    actorAdminId: string,
    noteId: string,
    targetAdminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_NOTE_CREATED',
        entityType: 'AdminNote',
        entityId: noteId,
        metadata: { ...metadata, targetAdminId },
      },
      tx,
    );
  }

  async logNoteUpdated(
    actorAdminId: string,
    noteId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_NOTE_UPDATED',
        entityType: 'AdminNote',
        entityId: noteId,
        metadata,
      },
      tx,
    );
  }

  async logNoteDeleted(
    actorAdminId: string,
    noteId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_NOTE_DELETED',
        entityType: 'AdminNote',
        entityId: noteId,
        metadata,
      },
      tx,
    );
  }

  async logSessionsRevoked(
    actorAdminId: string,
    targetAdminId: string,
    metadata: RequestSecurityMetadata,
    revokedCount: number,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_SESSIONS_REVOKED',
        entityType: 'PlatformAdmin',
        entityId: targetAdminId,
        metadata: { ...metadata, revokedCount },
      },
      tx,
    );
  }

  async logPasswordReset(
    actorAdminId: string,
    targetAdminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'ADMIN_PASSWORD_RESET',
        entityType: 'PlatformAdmin',
        entityId: targetAdminId,
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
