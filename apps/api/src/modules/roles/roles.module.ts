import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { RolesAuditService } from './services/roles-audit.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [AuthRbacModule],
  controllers: [RolesController],
  providers: [RolesService, RolesAuditService],
  exports: [RolesService],
})
export class RolesModule {}
