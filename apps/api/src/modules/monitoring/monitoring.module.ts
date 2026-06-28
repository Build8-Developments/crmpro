import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StorageModule } from '../../common/storage/storage.module';
import { AutomationModule } from '../automation/automation.module';
import { CleanupModule } from '../cleanup/cleanup.module';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import { HealthCheckService } from './health/health-check.service';
import { MetricsService } from './metrics/metrics.service';
import { QueueMetricsService } from './metrics/queue-metrics.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    JobsModule,
    CleanupModule,
    NotificationsModule,
    AutomationModule,
    TasksModule,
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
