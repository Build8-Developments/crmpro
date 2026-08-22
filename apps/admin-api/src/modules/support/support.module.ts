import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuthModule } from '../auth/auth.module';
import { AdminSupportController } from './support.controller';
import { AdminSupportService } from './support.service';
import { StreamingModule } from '../streaming/streaming.module';

@Module({
  imports: [AuthModule, AuthRbacModule, StreamingModule],
  controllers: [AdminSupportController],
  providers: [AdminSupportService],
})
export class SupportModule {}
