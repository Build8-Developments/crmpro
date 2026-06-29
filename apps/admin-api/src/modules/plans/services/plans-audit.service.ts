import { Injectable } from '@nestjs/common';
import { AdminActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { RequestSecurityMetadata } from '../../auth/auth.types';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class PlansAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logPlanCreated(
    actorAdminId: string,
    planId: string,
    metadata: RequestSecurityMetadata,
    details: Record<string, unknown>,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'PLAN_CREATED',
        entityType: 'SubscriptionPlan',
        entityId: planId,
        metadata: { ...metadata, ...details },
      },
      tx,
    );
  }

  async logPlanUpdated(
    actorAdminId: string,
    planId: string,
    metadata: RequestSecurityMetadata,
    changes: Record<string, unknown>,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'PLAN_UPDATED',
        entityType: 'SubscriptionPlan',
        entityId: planId,
        metadata: { ...metadata, changes },
      },
      tx,
    );
  }

  async logPlanArchived(
    actorAdminId: string,
    planId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'PLAN_ARCHIVED',
        entityType: 'SubscriptionPlan',
        entityId: planId,
        metadata,
      },
      tx,
    );
  }

  async logPlanUnarchived(
    actorAdminId: string,
    planId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.write(
      {
        actorAdminId,
        action: 'PLAN_UNARCHIVED',
        entityType: 'SubscriptionPlan',
        entityId: planId,
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
