import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditWriterService } from './audit-writer.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  imports: [AuthRbacModule],
  controllers: [AuditController],
  providers: [AuditService, AuditWriterService],
  exports: [AuditWriterService],
})
export class AuditModule {}
