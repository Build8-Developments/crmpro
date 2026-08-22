import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { StreamingModule } from '../streaming/streaming.module';

@Module({
  imports: [AuthRbacModule, StreamingModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
