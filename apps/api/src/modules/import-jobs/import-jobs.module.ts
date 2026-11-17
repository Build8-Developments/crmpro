import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { EntitlementsModule } from '../../common/entitlements/entitlements.module';
import { TenantModule } from '../../common/tenant/tenant.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeadDistributionModule } from '../lead-distribution/lead-distribution.module';
import { LeadsModule } from '../leads/leads.module';
import { LeadScopeModule } from '../leads/scope/lead-scope.module';
import { QueueModule } from '../jobs/queues/queue.module';
import { ImportJobsController } from './import-jobs.controller';
import { ImportJobsService } from './import-jobs.service';

@Module({
  imports: [
    AuthRbacModule,
    EntitlementsModule,
    TenantModule,
    AuditModule,
    NotificationsModule,
    LeadsModule,
    LeadScopeModule,
    LeadDistributionModule,
    QueueModule,
  ],
  controllers: [ImportJobsController],
  providers: [ImportJobsService],
  exports: [ImportJobsService],
})
export class ImportJobsModule {}
