import { Injectable } from '@nestjs/common';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { TEAM_TOP_PERFORMERS_LIMIT } from '../analytics.constants';
import type { TeamAnalyticsData } from '../analytics.types';
import { AnalyticsQueryService } from '../queries/analytics-query.service';

@Injectable()
export class TeamAnalyticsService {
  constructor(private readonly queryService: AnalyticsQueryService) {}

  async getTeam(
    tenantId: string,
    scope: LeadScope,
  ): Promise<TeamAnalyticsData> {
    // Agent performance is already limited to the users in the caller's scope.
    const agents = await this.queryService.getAgentPerformance(
      tenantId,
      {},
      scope,
    );

    const topPerformers = agents
      .slice(0, TEAM_TOP_PERFORMERS_LIMIT)
      .map((agent) => ({
        userId: agent.userId,
        name: agent.name,
        assignedLeads: agent.assignedLeads,
        wonLeads: agent.won,
        conversionRate:
          agent.assignedLeads > 0
            ? Math.round((agent.won / agent.assignedLeads) * 1000) / 10
            : 0,
      }));

    return { topPerformers };
  }
}
