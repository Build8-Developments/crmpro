import { Module } from '@nestjs/common';
import { CleanupModule } from '../cleanup/cleanup.module';
import { ExportJobsModule } from '../export-jobs/export-jobs.module';
import { ImportJobsModule } from '../import-jobs/import-jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationModule } from '../automation/automation.module';
import { TasksModule } from '../tasks/tasks.module';
import { BullModule } from './bull/bull.module';
import { JobsHealthService } from './jobs-health.service';
import { ExportProcessor } from './processors/export.processor';
import { ImportProcessor } from './processors/import.processor';
import { QueueModule } from './queues/queue.module';

@Module({
  imports: [
    BullModule,
    QueueModule,
    ImportJobsModule,
    ExportJobsModule,
    CleanupModule,
    NotificationsModule,
    AutomationModule,
    TasksModule,
  ],
  providers: [
    ImportProcessor,
    ExportProcessor,
    JobsHealthService,
  ],
  exports: [QueueModule, JobsHealthService],
})
export class JobsModule {}
