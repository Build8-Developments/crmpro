import { Injectable } from '@nestjs/common';
import { LeadActivityEventType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeadActivityResponse } from '../types/lead.types';

const activitySelect = {
  id: true,
  tenantId: true,
  leadId: true,
  actorUserId: true,
  eventType: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.LeadActivitySelect;

type ActivityRecord = Prisma.LeadActivityGetPayload<{
  select: typeof activitySelect;
}>;

@Injectable()
export class LeadActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async createActivity(
    params: {
      tenantId: string;
      leadId: string;
      actorUserId?: string | null;
      eventType: LeadActivityEventType;
      metadata?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<LeadActivityResponse> {
    const client = tx ?? this.prisma;

    const activity = await client.leadActivity.create({
      data: {
        tenantId: params.tenantId,
        leadId: params.leadId,
        actorUserId: params.actorUserId ?? null,
        eventType: params.eventType,
        metadata: params.metadata ?? {},
      },
      select: activitySelect,
    });

    return this.toActivityResponse(activity);
  }

  private toActivityResponse(activity: ActivityRecord): LeadActivityResponse {
    return {
      id: activity.id,
      tenantId: activity.tenantId,
      leadId: activity.leadId,
      actorUserId: activity.actorUserId,
      eventType: activity.eventType,
      metadata: activity.metadata,
      createdAt: activity.createdAt,
    };
  }
}
