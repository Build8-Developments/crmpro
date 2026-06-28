import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { LeadsModule } from '../leads/leads.module';
import { QueueModule } from '../jobs/queues/queue.module';
import { ImportJobsController } from './import-jobs.controller';
import { ImportJobWatchdogService } from './import-job-watchdog.service';
import { ImportJobsService } from './import-jobs.service';

@Module({
  imports: [AuthRbacModule, LeadsModule, QueueModule],
  controllers: [ImportJobsController],
  providers: [ImportJobsService, ImportJobWatchdogService],
  exports: [ImportJobsService],
})
export class ImportJobsModule {}
