import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadActivityService } from './services/lead-activity.service';
import { LeadAssignmentService } from './services/lead-assignment.service';
import { LeadStageService } from './services/lead-stage.service';

@Module({
  imports: [AuthRbacModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LeadActivityService,
    LeadStageService,
    LeadAssignmentService,
  ],
})
export class LeadsModule {}
