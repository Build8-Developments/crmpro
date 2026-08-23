import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthRbacModule, RealtimeModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
