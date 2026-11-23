import { Injectable } from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import type { LeadScope } from '../../common/auth/lead-scope/lead-scope.types';
import { PermissionsService } from '../../common/auth/services/permissions.service';
import type { AnalyticsRangeKey } from './analytics.constants';
import type { AnalyticsDashboardData } from './analytics.types';
import { parseAnalyticsRange } from './utils/analytics-range.util';
import { getVisibleDashboardSections } from './utils/analytics-section-permissions.util';
import { ActivityAnalyticsService } from './services/activity-analytics.service';
import { OverviewAnalyticsService } from './services/overview-analytics.service';
import { PipelineAnalyticsService } from './services/pipeline-analytics.service';
import { TeamAnalyticsService } from './services/team-analytics.service';
import { TrendAnalyticsService } from './services/trend-analytics.service';
import { AnalyticsQueryService } from './queries/analytics-query.service';

@Injectable()
export class AnalyticsAggregatorService {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly overviewService: OverviewAnalyticsService,
    private readonly pipelineService: PipelineAnalyticsService,
    private readonly trendService: TrendAnalyticsService,
    private readonly teamService: TeamAnalyticsService,
    private readonly activityService: ActivityAnalyticsService,
    private readonly queryService: AnalyticsQueryService,
  ) {}

  async getDashboard(
    userId: string,
    tenantId: string,
    range: AnalyticsRangeKey,
    scope: LeadScope,
  ): Promise<AnalyticsDashboardData> {
    const permissionKeys =
      await this.permissionsService.getPermissionKeysForUser(userId, tenantId);
    const sections = getVisibleDashboardSections(permissionKeys);
    const dateRange = parseAnalyticsRange(range);

    const data: AnalyticsDashboardData = {};
    const tasks: Promise<void>[] = [];

    if (sections.overview) {
      tasks.push(
        this.overviewService
          .getOverview(tenantId, dateRange, scope)
          .then((overview) => {
            data.overview = overview;
          }),
      );
    }

    if (sections.pipeline) {
      tasks.push(
        this.pipelineService.getPipeline(tenantId, scope).then((pipeline) => {
          data.pipeline = pipeline;
        }),
      );
    }

    if (sections.trends) {
      tasks.push(
        this.trendService
          .getTrends(tenantId, dateRange, scope)
          .then((trends) => {
            data.trends = trends;
          }),
      );
    }

    if (sections.team) {
      tasks.push(
        this.teamService.getTeam(tenantId, scope).then((team) => {
          data.team = team;
        }),
      );
    }

    if (sections.activity) {
      tasks.push(
        this.activityService
          .getActivity(
            tenantId,
            { includeAudit: permissionKeys.has(PERMISSIONS.AUDIT_READ) },
            scope,
          )
          .then((activity) => {
            data.activity = activity;
          }),
      );
    }

    if (sections.sources) {
      tasks.push(
        this.queryService
          .getLeadSources(tenantId, dateRange, scope)
          .then((sources) => {
            data.sources = sources;
          }),
      );
    }

    if (sections.projects) {
      tasks.push(
        this.queryService
          .getProjectPerformance(tenantId, dateRange, scope)
          .then((projects) => {
            data.projects = projects;
          }),
      );
    }

    if (sections.developers) {
      tasks.push(
        this.queryService
          .getDeveloperPerformance(tenantId, dateRange, scope)
          .then((developers) => {
            data.developers = developers;
          }),
      );
    }

    if (sections.status) {
      tasks.push(
        this.queryService
          .getStatusDistribution(tenantId, dateRange, scope)
          .then((status) => {
            data.status = status;
          }),
      );
    }

    await Promise.all(tasks);

    return data;
  }
}
