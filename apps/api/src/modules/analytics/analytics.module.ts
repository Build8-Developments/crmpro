import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { EntitlementsModule } from '../../common/entitlements/entitlements.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TargetsModule } from '../targets/targets.module';
import { AnalyticsController } from './analytics.controller';
import { DashboardAttentionService } from './dashboard-v2/dashboard-attention.service';
import { DashboardLossesService } from './dashboard-v2/dashboard-losses.service';
import { DashboardMoneyService } from './dashboard-v2/dashboard-money.service';
import { DashboardPeriodService } from './dashboard-v2/dashboard-period.service';
import { DashboardSourcesService } from './dashboard-v2/dashboard-sources.service';
import { DashboardTeamService } from './dashboard-v2/dashboard-team.service';
import { DashboardV2Controller } from './dashboard-v2/dashboard-v2.controller';
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
  imports: [
    AuthRbacModule,
    EntitlementsModule,
    TargetsModule,
    // Dashboard v2 "nudge agent" (in-app notification + audit row).
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AnalyticsController, DashboardV2Controller],
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
    DashboardPeriodService,
    DashboardAttentionService,
    DashboardMoneyService,
    DashboardTeamService,
    DashboardSourcesService,
    DashboardLossesService,
  ],
})
export class AnalyticsModule {}
