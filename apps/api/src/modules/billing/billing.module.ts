import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [AuthRbacModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
