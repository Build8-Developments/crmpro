import { Injectable } from '@nestjs/common';
import { TEAM_TOP_PERFORMERS_LIMIT } from '../analytics.constants';
import type { TeamAnalyticsData } from '../analytics.types';
import { AnalyticsQueryService } from '../queries/analytics-query.service';

@Injectable()
export class TeamAnalyticsService {
  constructor(private readonly queryService: AnalyticsQueryService) {}

  async getTeam(tenantId: string): Promise<TeamAnalyticsData> {
    const agents = await this.queryService.getAgentPerformance(tenantId, {});

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
