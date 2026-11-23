import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditModule } from '../audit/audit.module';
import { SourceSpendController } from './source-spend.controller';
import { SourceSpendService } from './source-spend.service';

/** Monthly marketing spend per lead source and cost per result (spec §2.7). */
@Module({
  imports: [AuthRbacModule, AuditModule],
  controllers: [SourceSpendController],
  providers: [SourceSpendService],
})
export class SourceSpendModule {}
