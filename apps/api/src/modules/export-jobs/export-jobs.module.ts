import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { FilesModule } from '../files/files.module';
import { LeadsModule } from '../leads/leads.module';
import { QueueModule } from '../jobs/queues/queue.module';
import { ExportJobsController } from './controllers/export-jobs.controller';
import { ExportJobWatchdogService } from './export-job-watchdog.service';
import { CsvExportService } from './services/csv-export.service';
import { ExportJobsService } from './services/export-jobs.service';
import { LeadExportService } from './services/lead-export.service';

@Module({
  imports: [AuthRbacModule, LeadsModule, FilesModule, QueueModule],
  controllers: [ExportJobsController],
  providers: [
    ExportJobsService,
    LeadExportService,
    CsvExportService,
    ExportJobWatchdogService,
  ],
  exports: [ExportJobsService],
})
export class ExportJobsModule {}
