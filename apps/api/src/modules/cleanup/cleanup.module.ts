import { Module } from '@nestjs/common';
import { StorageModule } from '../../common/storage/storage.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { QueueModule } from '../jobs/queues/queue.module';
import { CleanupHealthService } from './cleanup-health.service';
import { CleanupSchedulerService } from './cleanup-scheduler.service';
import { CleanupService } from './cleanup.service';
import { CleanupProcessor } from './workers/cleanup.processor';

@Module({
  imports: [PrismaModule, StorageModule, QueueModule],
  providers: [
    CleanupService,
    CleanupHealthService,
    CleanupSchedulerService,
    CleanupProcessor,
  ],
  exports: [
    CleanupService,
    CleanupHealthService,
    CleanupProcessor,
    CleanupSchedulerService,
    QueueModule,
  ],
})
export class CleanupModule {}
