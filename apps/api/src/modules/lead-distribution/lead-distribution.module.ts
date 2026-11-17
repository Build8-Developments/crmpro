import { Module } from '@nestjs/common';
import { TenantModule } from '../../common/tenant/tenant.module';
import { LeadActivityModule } from '../leads/lead-activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { LeadDistributionService } from './lead-distribution.service';
import { LeadSlaService } from './lead-sla.service';

@Module({
  imports: [
    TenantModule,
    LeadActivityModule,
    NotificationsModule,
    SchedulerModule,
  ],
  providers: [LeadDistributionService, LeadSlaService],
  exports: [LeadDistributionService],
})
export class LeadDistributionModule {}
