import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { LeadSourcesController } from './lead-sources.controller';
import { LeadSourcesService } from './lead-sources.service';

@Module({
  imports: [AuthRbacModule],
  controllers: [LeadSourcesController],
  providers: [LeadSourcesService],
})
export class LeadSourcesModule {}
