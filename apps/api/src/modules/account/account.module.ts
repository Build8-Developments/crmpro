import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditModule } from '../audit/audit.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [AuthRbacModule, AuditModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
