import { Module } from '@nestjs/common';
import { TenantStatusService } from './tenant-status.service';

@Module({
  providers: [TenantStatusService],
  exports: [TenantStatusService],
})
export class TenantModule {}
