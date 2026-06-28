import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StorageModule } from '../../common/storage/storage.module';
import { CleanupModule } from '../cleanup/cleanup.module';
import { JobsModule } from '../jobs/jobs.module';
import { HealthCheckService } from './health/health-check.service';
import { MetricsService } from './metrics/metrics.service';
import { QueueMetricsService } from './metrics/queue-metrics.service';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [PrismaModule, StorageModule, JobsModule, CleanupModule],
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
