import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [AuthRbacModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
