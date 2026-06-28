import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsInvalidationService } from './analytics-invalidation.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryService } from './queries/analytics-query.service';
import { AnalyticsDateRangePipe } from './queries/analytics-date.util';
import { AnalyticsExportService } from './services/analytics-export.service';

@Module({
  imports: [AuthRbacModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsQueryService,
    AnalyticsExportService,
    AnalyticsInvalidationService,
    AnalyticsDateRangePipe,
  ],
  exports: [AnalyticsInvalidationService],
})
export class AnalyticsModule {}
