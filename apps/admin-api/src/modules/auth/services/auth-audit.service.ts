import { Injectable } from '@nestjs/common';
import { AdminActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { RequestSecurityMetadata } from '../auth.types';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class AuthAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logLogin(
    adminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId: adminId,
        action: 'LOGIN',
        entityType: 'PlatformAdmin',
        entityId: adminId,
        metadata,
      },
      tx,
    );
  }

  async logLogout(
    adminId: string,
    sessionId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId: adminId,
        action: 'LOGOUT',
        entityType: 'AdminSession',
        entityId: sessionId,
        metadata,
      },
      tx,
    );
  }

  async logLogoutAll(
    adminId: string,
    metadata: RequestSecurityMetadata,
    revokedCount: number,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId: adminId,
        action: 'LOGOUT_ALL',
        entityType: 'PlatformAdmin',
        entityId: adminId,
        metadata: { ...metadata, revokedCount },
      },
      tx,
    );
  }

  async logSessionRevoked(
    adminId: string,
    sessionId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId: adminId,
        action: 'SESSION_REVOKED',
        entityType: 'AdminSession',
        entityId: sessionId,
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
