import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationModule } from '../automation/automation.module';
import { LeadsModule } from '../leads/leads.module';
import { QueueModule } from '../jobs/queues/queue.module';
import { ImportJobsController } from './import-jobs.controller';
import { ImportJobsService } from './import-jobs.service';

@Module({
  imports: [AuthRbacModule, AnalyticsModule, NotificationsModule, AutomationModule, LeadsModule, QueueModule],
  controllers: [ImportJobsController],
  providers: [ImportJobsService],
  exports: [ImportJobsService],
})
export class ImportJobsModule {}
