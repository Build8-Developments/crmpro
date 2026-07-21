import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { SecurityModule } from '../../common/security/security.module';
import { AuthModule } from '../auth/auth.module';
import { TenantNotesService } from './services/tenant-notes.service';
import { TenantOwnerService } from './services/tenant-owner.service';
import { TenantProvisioningService } from './services/tenant-provisioning.service';
import { TenantUsageService } from './services/tenant-usage.service';
import { TenantsAuditService } from './services/tenants-audit.service';
import { TenantNotesController } from './tenant-notes.controller';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [AuthModule, AuthRbacModule, SecurityModule],
  controllers: [TenantsController, TenantNotesController],
  providers: [
    TenantsService,
    TenantProvisioningService,
    TenantOwnerService,
    TenantUsageService,
    TenantNotesService,
    TenantsAuditService,
  ],
})
export class TenantsModule {}
