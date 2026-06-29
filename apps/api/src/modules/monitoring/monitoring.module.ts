import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StorageModule } from '../../common/storage/storage.module';
import { CleanupMonitoringModule } from '../cleanup/cleanup-monitoring.module';
import { JobsMonitoringModule } from '../jobs/jobs-monitoring.module';
import { NotificationsMonitoringModule } from '../notifications/notifications-monitoring.module';
import { HealthCheckService } from './health/health-check.service';
import { MetricsService } from './metrics/metrics.service';
import { QueueMetricsService } from './metrics/queue-metrics.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [
    AuthRbacModule,
    PrismaModule,
    StorageModule,
    JobsMonitoringModule,
    CleanupMonitoringModule,
    NotificationsMonitoringModule,
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    HealthCheckService,
    MetricsService,
    QueueMetricsService,
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}
