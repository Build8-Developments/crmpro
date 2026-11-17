import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectUpdatesController } from './project-updates.controller';
import { ProjectUpdatesService } from './project-updates.service';

@Module({
  imports: [AuthRbacModule, AuditModule, NotificationsModule],
  controllers: [ProjectUpdatesController],
  providers: [ProjectUpdatesService],
})
export class ProjectUpdatesModule {}
