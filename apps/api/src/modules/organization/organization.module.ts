import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { TenantSettingsService } from './tenant-settings.service';

@Module({
  imports: [AuthRbacModule, AuditModule, FilesModule],
  controllers: [OrganizationController],
  providers: [OrganizationService, TenantSettingsService],
  exports: [OrganizationService, TenantSettingsService],
})
export class OrganizationModule {}
