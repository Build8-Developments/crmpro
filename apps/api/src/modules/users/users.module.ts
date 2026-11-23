import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { QuotaModule } from '../../common/quota/quota.module';
import { AuditModule } from '../audit/audit.module';
import { UserGuardService } from './services/user-guard.service';
import { UserSessionService } from './services/user-session.service';
import { UsersAuditService } from './services/users-audit.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserInvitationsService } from './services/user-invitations.service';

@Module({
  imports: [AuthRbacModule, QuotaModule, AuditModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersAuditService,
    UserSessionService,
    UserGuardService,
    UserInvitationsService,
  ],
  exports: [UsersService, UserGuardService],
})
export class UsersModule {}
