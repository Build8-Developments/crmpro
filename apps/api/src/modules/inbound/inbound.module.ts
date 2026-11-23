import { Module } from '@nestjs/common';
import { EntitlementsModule } from '../../common/entitlements/entitlements.module';
import { RateLimitModule } from '../../common/rate-limit/rate-limit.module';
import { TenantAccessModule } from '../../common/tenant-access/tenant-access.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { LeadActivityModule } from '../leads/lead-activity.module';
import { LeadsModule } from '../leads/leads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApiKeyGuard } from './guards/api-key.guard';
import { InboundLeadsController } from './inbound-leads.controller';
import { InboundLeadsService } from './inbound-leads.service';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    ApiKeysModule,
    EntitlementsModule,
    RateLimitModule,
    TenantAccessModule,
    LeadsModule,
    LeadActivityModule,
    NotificationsModule,
    WorkflowModule,
  ],
  controllers: [InboundLeadsController],
  providers: [InboundLeadsService, ApiKeyGuard],
})
export class InboundModule {}
