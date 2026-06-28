import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';

@Module({
  imports: [AuthRbacModule, AnalyticsModule],
  controllers: [PipelinesController],
  providers: [PipelinesService],
})
export class PipelinesModule {}
