import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditModule } from '../audit/audit.module';
import { TargetActualsService } from './target-actuals.service';
import { TargetsController } from './targets.controller';
import { TargetsService } from './targets.service';

/** Monthly targets per person and workspace, with actuals (spec §2.6). */
@Module({
  imports: [AuthRbacModule, AuditModule],
  controllers: [TargetsController],
  providers: [TargetsService, TargetActualsService],
  exports: [TargetsService, TargetActualsService],
})
export class TargetsModule {}
