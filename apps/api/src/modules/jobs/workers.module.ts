import { Module } from '@nestjs/common';
import { CleanupModule } from '../cleanup/cleanup.module';
import { ExportJobsModule } from '../export-jobs/export-jobs.module';
import { ImportJobsModule } from '../import-jobs/import-jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CleanupProcessor } from '../cleanup/workers/cleanup.processor';
import { NotificationProcessor } from '../notifications/workers/notification.processor';
import { JobsHealthProvider } from './jobs-health.provider';
import { JobsCoreModule } from './jobs-core.module';
import { ExportProcessor } from './processors/export.processor';
import { ImportProcessor } from './processors/import.processor';

@Module({
  imports: [
    JobsCoreModule,
    ImportJobsModule,
    ExportJobsModule,
    CleanupModule,
    NotificationsModule,
  ],
  providers: [
    ImportProcessor,
    ExportProcessor,
    CleanupProcessor,
    NotificationProcessor,
    JobsHealthProvider,
  ],
  exports: [JobsHealthProvider],
})
export class WorkersModule {}
