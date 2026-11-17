import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import {
  leadScopeCacheKey,
  type LeadScope,
} from '../leads/scope/lead-scope.types';
import { LoggingService } from '../../common/logging/logging.service';
import { ANALYTICS_ENDPOINTS } from './analytics.constants';
import {
  AgentPerformanceAnalytics,
  AnalyticsCacheResult,
  AnalyticsDateRange,
  ActivityFeedItem,
  DashboardOverviewData,
  DeveloperPerformanceAnalytics,
  LeadSourceAnalytics,
  LeadStatusDistribution,
  LeadTrendPoint,
  PipelineAnalyticsData,
  PipelineFunnelAnalytics,
  ProjectPerformanceAnalytics,
  RecentActivityResult,
  TeamAnalyticsData,
  TrendAnalyticsData,
} from './analytics.types';
import { AnalyticsQueryService } from './queries/analytics-query.service';
import { OverviewAnalyticsService } from './services/overview-analytics.service';
import { PipelineAnalyticsService } from './services/pipeline-analytics.service';
import { TrendAnalyticsService } from './services/trend-analytics.service';
import { TeamAnalyticsService } from './services/team-analytics.service';
import { ActivityAnalyticsService } from './services/activity-analytics.service';

type AnalyticsHandler<T> = () => Promise<T>;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly queryService: AnalyticsQueryService,
    private readonly overviewService: OverviewAnalyticsService,
    private readonly pipelineService: PipelineAnalyticsService,
    private readonly trendService: TrendAnalyticsService,
    private readonly teamService: TeamAnalyticsService,
    private readonly activityService: ActivityAnalyticsService,
    private readonly cacheService: CacheService,
    private readonly loggingService: LoggingService,
  ) {}

  // Every method takes the caller's lead scope: results are filtered to the
  // leads the caller may see and cached under a scope-specific key.

  getOverview(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<DashboardOverviewData>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.overview,
      range,
      () => this.overviewService.getOverview(tenantId, range, scope),
    );
  }

  getPipelineAnalytics(
    tenantId: string,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<PipelineAnalyticsData>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.pipeline,
      {},
      () => this.pipelineService.getPipeline(tenantId, scope),
    );
  }

  getTrendAnalytics(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<TrendAnalyticsData>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.trends,
      range,
      () => this.trendService.getTrends(tenantId, range, scope),
    );
  }

  getTeamAnalytics(
    tenantId: string,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<TeamAnalyticsData>> {
    return this.withCache(tenantId, scope, ANALYTICS_ENDPOINTS.team, {}, () =>
      this.teamService.getTeam(tenantId, scope),
    );
  }

  getActivityFeed(
    tenantId: string,
    includeAudit: boolean,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<ActivityFeedItem[]>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.activity,
      {},
      () => this.activityService.getActivity(tenantId, { includeAudit }, scope),
      includeAudit ? 'audit' : 'lead',
    );
  }

  getPipelineFunnel(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<PipelineFunnelAnalytics[]>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.pipeline,
      range,
      () => this.queryService.getPipelineFunnel(tenantId, range, scope),
    );
  }

  getLeadSources(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<LeadSourceAnalytics[]>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.sources,
      range,
      () => this.queryService.getLeadSources(tenantId, range, scope),
    );
  }

  getAgentPerformance(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<AgentPerformanceAnalytics[]>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.agents,
      range,
      () => this.queryService.getAgentPerformance(tenantId, range, scope),
    );
  }

  getProjectPerformance(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<ProjectPerformanceAnalytics[]>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.projects,
      range,
      () => this.queryService.getProjectPerformance(tenantId, range, scope),
    );
  }

  getDeveloperPerformance(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<DeveloperPerformanceAnalytics[]>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.developers,
      range,
      () => this.queryService.getDeveloperPerformance(tenantId, range, scope),
    );
  }

  getLeadTrends(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<LeadTrendPoint[]>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.trends,
      range,
      () => this.queryService.getLeadTrends(tenantId, range, scope),
    );
  }

  getStatusDistribution(
    tenantId: string,
    range: AnalyticsDateRange,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<LeadStatusDistribution>> {
    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.status,
      range,
      () => this.queryService.getStatusDistribution(tenantId, range, scope),
    );
  }

  getRecentActivity(
    tenantId: string,
    range: AnalyticsDateRange,
    page: number,
    limit: number,
    scope: LeadScope,
  ): Promise<AnalyticsCacheResult<RecentActivityResult>> {
    const fromKey = range.from?.toISOString();
    const toKey = range.to?.toISOString();
    const extra = `p${page}:l${limit}`;

    return this.withCache(
      tenantId,
      scope,
      ANALYTICS_ENDPOINTS.recentActivity,
      { from: range.from, to: range.to },
      () =>
        this.queryService.getRecentActivity(
          tenantId,
          range,
          page,
          limit,
          scope,
        ),
      extra,
      fromKey,
      toKey,
    );
  }

  private async withCache<T>(
    tenantId: string,
    scope: LeadScope,
    endpoint: string,
    range: AnalyticsDateRange,
    handler: AnalyticsHandler<T>,
    extra?: string,
    fromKey?: string,
    toKey?: string,
  ): Promise<AnalyticsCacheResult<T>> {
    const startedAt = Date.now();
    const cacheKey = this.cacheService.buildAnalyticsKey(
      tenantId,
      endpoint,
      fromKey ?? range.from?.toISOString(),
      toKey ?? range.to?.toISOString(),
      [leadScopeCacheKey(scope), extra].filter(Boolean).join(':'),
    );

    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached !== null) {
      this.logAnalytics(endpoint, Date.now() - startedAt, true);
      return { data: cached, cacheHit: true };
    }

    const data = await handler();
    await this.cacheService.set(
      cacheKey,
      data,
      this.cacheService.getAnalyticsTtlSeconds(),
    );

    this.logAnalytics(endpoint, Date.now() - startedAt, false);
    return { data, cacheHit: false };
  }

  private logAnalytics(
    endpoint: string,
    durationMs: number,
    cacheHit: boolean,
  ): void {
    this.loggingService.info({
      module: 'Analytics',
      operation: endpoint,
      durationMs,
      status: cacheHit ? 'cache_hit' : 'cache_miss',
      metadata: {
        cacheHit,
      },
    });
  }
}
