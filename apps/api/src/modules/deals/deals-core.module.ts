import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AuditModule } from '../audit/audit.module';
import { LeadActivityModule } from '../leads/lead-activity.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { DealRecorderService } from './services/deal-recorder.service';

/**
 * Deal writes the leads module needs (create on Won, live-deal guard). No
 * controllers and no dependency on LeadsModule, so LeadsModule can import it.
 * WorkflowModule provides the deal rules (R10 paperwork on reservation).
 */
@Module({
  imports: [AuthRbacModule, AuditModule, LeadActivityModule, WorkflowModule],
  providers: [DealRecorderService],
  exports: [DealRecorderService],
})
export class DealsCoreModule {}
