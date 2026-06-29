import { Injectable } from '@nestjs/common';
import { AuditActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';

export type CreateAuditLogInput = {
  tenantId: string;
  actorUserId?: string | null;
  actorType?: AuditActorType;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
};

@Injectable()
export class AuditWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async createAuditLog(input: CreateAuditLogInput): Promise<void> {
    const client = input.tx ?? this.prisma;

    await client.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorType: input.actorType ?? AuditActorType.USER,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
