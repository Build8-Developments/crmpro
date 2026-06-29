import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { QuotaModule } from '../../common/quota/quota.module';
import { AuditModule } from '../audit/audit.module';
import { LeadAttachmentModule } from '../lead-attachments/lead-attachment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeadNotesController } from './lead-notes.controller';
import { LeadsBulkController } from './leads-bulk.controller';
import { LeadsBulkService } from './leads-bulk.service';
import { LeadsController } from './leads.controller';
import { LeadActivityModule } from './lead-activity.module';
import { LeadsService } from './leads.service';
import { LeadAccessService } from './services/lead-access.service';
import { LeadAssignmentService } from './services/lead-assignment.service';
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
  ],
  controllers: [LeadsController, LeadNotesController, LeadsBulkController],
  providers: [
    LeadsService,
    LeadsBulkService,
    LeadStageService,
    LeadAssignmentService,
    LeadAccessService,
    LeadNotesService,
    LeadTimelineService,
  ],
  exports: [LeadActivityModule, LeadsService],
})
export class LeadsModule {}
