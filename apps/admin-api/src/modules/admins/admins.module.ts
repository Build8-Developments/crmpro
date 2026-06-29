import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { SecurityModule } from '../../common/security/security.module';
import { AuthModule } from '../auth/auth.module';
import { AdminNotesController } from './admin-notes.controller';
import { AdminNotesService } from './admin-notes.service';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { AdminsAuditService } from './services/admins-audit.service';

@Module({
  imports: [AuthModule, AuthRbacModule, SecurityModule],
  controllers: [AdminsController, AdminNotesController],
  providers: [AdminsService, AdminNotesService, AdminsAuditService],
})
export class AdminsModule {}
