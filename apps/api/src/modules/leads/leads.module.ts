import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { QuotaModule } from '../../common/quota/quota.module';
import { AuditModule } from '../audit/audit.module';
import { DealsCoreModule } from '../deals/deals-core.module';
import { LeadAttachmentModule } from '../lead-attachments/lead-attachment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { LeadNotesController } from './lead-notes.controller';
import { LeadsBulkController } from './leads-bulk.controller';
import { LeadsBulkService } from './leads-bulk.service';
import { LeadsController } from './leads.controller';
import { LeadActivityModule } from './lead-activity.module';
import { LeadsService } from './leads.service';
import { LeadAccessService } from './services/lead-access.service';
import { LeadAssignmentService } from './services/lead-assignment.service';
import { LeadContactAccessService } from './services/lead-contact-access.service';
import { LeadMergeService } from './services/lead-merge.service';
import { LeadWorkloadService } from './services/lead-workload.service';
import { LeadNotesService } from './services/lead-notes.service';
import { LeadStageService } from './services/lead-stage.service';
import { LeadTimelineService } from './services/lead-timeline.service';

@Module({
  imports: [
    AuthRbacModule,
    QuotaModule,
    AuditModule,
    NotificationsModule,
    LeadActivityModule,
    LeadAttachmentModule,
    WorkflowModule,
    DealsCoreModule,
  ],
  // LeadsBulkController first: `/leads/bulk/assign` would otherwise match
  // LeadsController's `/leads/:id/assign` (with id "bulk") and fail UUID parsing.
  controllers: [LeadsBulkController, LeadsController, LeadNotesController],
  providers: [
    LeadsService,
    LeadsBulkService,
    LeadStageService,
    LeadAssignmentService,
    LeadAccessService,
    LeadContactAccessService,
    LeadMergeService,
    LeadWorkloadService,
    LeadNotesService,
    LeadTimelineService,
  ],
  exports: [LeadActivityModule, LeadsService, LeadStageService],
})
export class LeadsModule {}
