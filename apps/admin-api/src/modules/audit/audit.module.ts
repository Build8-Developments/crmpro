import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { SecurityEventsController } from './security-events.controller';
import { SecurityEventsService } from './security-events.service';

@Module({
  imports: [AuthModule, AuthRbacModule],
  controllers: [AuditController, SecurityEventsController],
  providers: [AuditService, SecurityEventsService],
})
export class AuditModule {}
