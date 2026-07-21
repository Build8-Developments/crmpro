import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuthModule } from '../auth/auth.module';
import { AdminSupportController } from './support.controller';
import { AdminSupportService } from './support.service';

@Module({
  imports: [AuthModule, AuthRbacModule],
  controllers: [AdminSupportController],
  providers: [AdminSupportService],
})
export class SupportModule {}
