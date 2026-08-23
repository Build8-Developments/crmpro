import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuthModule } from '../auth/auth.module';
import { AdminSupportController } from './support.controller';
import { AdminSupportService } from './support.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, AuthRbacModule, RealtimeModule],
  controllers: [AdminSupportController],
  providers: [AdminSupportService],
})
export class SupportModule {}
