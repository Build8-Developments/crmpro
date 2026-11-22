import { Injectable } from '@nestjs/common';
import { LeadStatus } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { STALE_LEAD_DAYS } from '../analytics.constants';
import type {
  AnalyticsDateRange,
  DashboardOverviewData,
} from '../analytics.types';
import { AnalyticsQueryService } from '../queries/analytics-query.service';
import { withLeadScope } from '../queries/analytics-scope.util';

@Injectable()
export class OverviewAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: AnalyticsQueryService,
  ) {}

  async getOverview(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<DashboardOverviewData> {
    const [base, staleLeads, unassignedLeads] = await Promise.all([
      this.queryService.getOverview(tenantId, range, scope),
      this.countStaleLeads(tenantId, scope),
      this.countUnassignedLeads(tenantId, scope),
    ]);

    return {
      ...base,
      staleLeads,
      unassignedLeads,
    };
  }

  private async countStaleLeads(
    tenantId: string,
    scope: LeadScope,
  ): Promise<number> {
    const staleBefore = new Date();
    staleBefore.setUTCDate(staleBefore.getUTCDate() - STALE_LEAD_DAYS);

    return this.prisma.lead.count({
      where: withLeadScope(
        {
          tenantId,
          deletedAt: null,
          status: LeadStatus.OPEN,
          pipelineStage: { isClosed: false },
          OR: [
            {
              lastContactedAt: null,
              createdAt: { lt: staleBefore },
            },
            {
              lastContactedAt: { lt: staleBefore },
            },
          ],
        },
        scope,
      ),
    });
  }

  private async countUnassignedLeads(
    tenantId: string,
    scope: LeadScope,
  ): Promise<number> {
    // Unassigned leads are visible in every scope; the filter is kept so the
    // count stays correct if that rule ever changes.
    return this.prisma.lead.count({
      where: withLeadScope(
        {
          tenantId,
          deletedAt: null,
          status: LeadStatus.OPEN,
          pipelineStage: { isClosed: false },
          assignedUserId: null,
        },
        scope,
      ),
    });
  }
}
