import { Module } from '@nestjs/common';
import { EntitlementsModule } from '../../common/entitlements/entitlements.module';
import { QuotaModule } from '../../common/quota/quota.module';
import { TenantAccessModule } from '../../common/tenant-access/tenant-access.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { LeadActivityModule } from '../leads/lead-activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApiKeyGuard } from './api-key.guard';
import { InboundLeadsController } from './inbound-leads.controller';
import { InboundLeadsService } from './inbound-leads.service';

@Module({
  imports: [
    ApiKeysModule,
    EntitlementsModule,
    TenantAccessModule,
    QuotaModule,
    LeadActivityModule,
    NotificationsModule,
  ],
  controllers: [InboundLeadsController],
  providers: [InboundLeadsService, ApiKeyGuard],
})
export class InboundModule {}
