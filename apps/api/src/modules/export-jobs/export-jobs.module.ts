import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { EntitlementsModule } from '../../common/entitlements/entitlements.module';
import { TenantModule } from '../../common/tenant/tenant.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FilesModule } from '../files/files.module';
import { LeadsModule } from '../leads/leads.module';
import { QueueModule } from '../jobs/queues/queue.module';
import { ExportJobsController } from './controllers/export-jobs.controller';
import { CsvExportService } from './services/csv-export.service';
import { ExportJobsService } from './services/export-jobs.service';
import { LeadExportService } from './services/lead-export.service';

@Module({
  imports: [
    AuthRbacModule,
    EntitlementsModule,
    TenantModule,
    NotificationsModule,
    LeadsModule,
    FilesModule,
    QueueModule,
  ],
  controllers: [ExportJobsController],
  providers: [ExportJobsService, LeadExportService, CsvExportService],
  exports: [ExportJobsService],
})
export class ExportJobsModule {}
