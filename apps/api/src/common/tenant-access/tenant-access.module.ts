import { Global, Module } from '@nestjs/common';
import { TenantAccessService } from './tenant-access.service';

/**
 * Global so the app-level TenantReadOnlyInterceptor (registered in
 * AppModule) shares this service and its read-only state cache. Modules may
 * still import it explicitly.
 */
@Global()
@Module({
  providers: [TenantAccessService],
  exports: [TenantAccessService],
})
export class TenantAccessModule {}
