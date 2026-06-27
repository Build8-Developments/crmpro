import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../../common/pagination';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { GetLeadActivitiesQueryDto } from '../dto/get-lead-activities-query.dto';
import { LeadTimelineActivityResponse } from '../types/lead.types';
import { LeadAccessService } from './lead-access.service';

const timelineActivitySelect = {
  id: true,
  eventType: true,
  metadata: true,
  createdAt: true,
  actor: {
    select: {
      id: true,
      email: true,
    },
  },
} satisfies Prisma.LeadActivitySelect;

type TimelineActivityRecord = Prisma.LeadActivityGetPayload<{
  select: typeof timelineActivitySelect;
}>;

@Injectable()
export class LeadTimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadAccessService: LeadAccessService,
  ) {}

  async getLeadActivities(
    leadId: string,
    tenantId: string,
    query: GetLeadActivitiesQueryDto,
  ): Promise<PaginatedResponse<LeadTimelineActivityResponse>> {
    await this.leadAccessService.getLeadOrThrow(leadId, tenantId);

    const { page, limit, skip, take } = getPaginationParams(query);
    const where: Prisma.LeadActivityWhereInput = {
      leadId,
      tenantId,
    };

    const [activities, totalItems] = await this.prisma.$transaction([
      this.prisma.leadActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: timelineActivitySelect,
        skip,
        take,
      }),
      this.prisma.leadActivity.count({ where }),
    ]);

    return buildPaginatedResponse(
      activities.map((activity) => this.toTimelineActivity(activity)),
      page,
      limit,
      totalItems,
    );
  }

  private toTimelineActivity(
    activity: TimelineActivityRecord,
  ): LeadTimelineActivityResponse {
    return {
      id: activity.id,
      eventType: activity.eventType,
      metadata: activity.metadata,
      actor: activity.actor,
      createdAt: activity.createdAt,
    };
  }
}
