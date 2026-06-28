import { Module } from '@nestjs/common';
import { CleanupModule } from '../cleanup/cleanup.module';
import { ExportJobsModule } from '../export-jobs/export-jobs.module';
import { ImportJobsModule } from '../import-jobs/import-jobs.module';
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
  ],
  providers: [
    ImportProcessor,
    ExportProcessor,
    JobsHealthService,
  ],
  exports: [QueueModule, JobsHealthService],
})
export class JobsModule {}
