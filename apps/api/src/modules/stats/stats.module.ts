import { EntitlementsModule } from '../../common/entitlements/entitlements.module';
import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { TenantAccessModule } from '../../common/tenant-access/tenant-access.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TargetsModule } from '../targets/targets.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { AchievementsService } from './achievements/achievements.service';
import { DailyStatsJobService } from './daily-stats-job.service';
import { DailyStatsService } from './daily-stats.service';
import { PerformanceService } from './performance/performance.service';
import { StatsController } from './stats.controller';
import { StatsQueryService } from './stats-query.service';

/**
 * UserDailyStat read model (spec §2.8): computed by the `daily-stats`
 * scheduler job, refreshed on demand for today, read by dashboards and
 * "My performance" (with badges, spec §4.1).
 */
@Module({
  imports: [
    AuthRbacModule,
    EntitlementsModule,
    TenantAccessModule,
    WorkflowModule,
    NotificationsModule,
    TargetsModule,
  ],
  controllers: [StatsController],
  providers: [
    DailyStatsService,
    DailyStatsJobService,
    StatsQueryService,
    AchievementsService,
    PerformanceService,
  ],
  exports: [DailyStatsService, AchievementsService],
})
export class StatsModule {}
