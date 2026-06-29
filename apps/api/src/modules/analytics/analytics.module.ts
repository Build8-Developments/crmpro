import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { EntitlementsModule } from '../../common/entitlements/entitlements.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsInvalidationListener } from './analytics-invalidation.listener';
import { AnalyticsInvalidationService } from './analytics-invalidation.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryService } from './queries/analytics-query.service';
import { AnalyticsDateRangePipe } from './queries/analytics-date.util';

@Module({
  imports: [AuthRbacModule, EntitlementsModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsQueryService,
    AnalyticsInvalidationService,
    AnalyticsInvalidationListener,
    AnalyticsDateRangePipe,
  ],
})
export class AnalyticsModule {}
