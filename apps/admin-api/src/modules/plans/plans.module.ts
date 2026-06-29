import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuthModule } from '../auth/auth.module';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlansAuditService } from './services/plans-audit.service';

@Module({
  imports: [AuthModule, AuthRbacModule],
  controllers: [PlansController],
  providers: [PlansService, PlansAuditService],
})
export class PlansModule {}
