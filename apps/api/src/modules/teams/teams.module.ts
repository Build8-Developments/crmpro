import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditModule } from '../audit/audit.module';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [AuthRbacModule, AuditModule],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
