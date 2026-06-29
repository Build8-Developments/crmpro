import { Module } from '@nestjs/common';
import { AdminPermissionsGuard } from './guards/admin-permissions.guard';
import { AdminPermissionsService } from './services/admin-permissions.service';

@Module({
  providers: [AdminPermissionsService, AdminPermissionsGuard],
  exports: [AdminPermissionsService, AdminPermissionsGuard],
})
export class AuthRbacModule {}
