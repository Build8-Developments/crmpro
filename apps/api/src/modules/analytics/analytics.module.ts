import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { EntitlementsModule } from '../../common/entitlements/entitlements.module';
import { LeadScopeModule } from '../leads/scope/lead-scope.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsAggregatorService } from './analytics-aggregator.service';
import { AnalyticsInvalidationListener } from './analytics-invalidation.listener';
import { AnalyticsInvalidationService } from './analytics-invalidation.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryService } from './queries/analytics-query.service';
import { AnalyticsDateRangePipe } from './queries/analytics-date.util';
import { OverviewAnalyticsService } from './services/overview-analytics.service';
import { PipelineAnalyticsService } from './services/pipeline-analytics.service';
import { TrendAnalyticsService } from './services/trend-analytics.service';
import { TeamAnalyticsService } from './services/team-analytics.service';
import { ActivityAnalyticsService } from './services/activity-analytics.service';

@Module({
  imports: [AuthRbacModule, EntitlementsModule, LeadScopeModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsAggregatorService,
    AnalyticsQueryService,
    OverviewAnalyticsService,
    PipelineAnalyticsService,
    TrendAnalyticsService,
    TeamAnalyticsService,
    ActivityAnalyticsService,
    AnalyticsInvalidationService,
    AnalyticsInvalidationListener,
    AnalyticsDateRangePipe,
  ],
})
export class AnalyticsModule {}
