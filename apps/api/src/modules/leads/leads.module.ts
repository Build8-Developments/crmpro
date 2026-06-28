import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { LeadAttachmentModule } from '../lead-attachments/lead-attachment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeadNotesController } from './lead-notes.controller';
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
    AnalyticsModule,
    NotificationsModule,
    LeadActivityModule,
    LeadAttachmentModule,
  ],
  controllers: [LeadsController, LeadNotesController],
  providers: [
    LeadsService,
    LeadStageService,
    LeadAssignmentService,
    LeadAccessService,
    LeadNotesService,
    LeadTimelineService,
  ],
  exports: [LeadActivityModule, LeadsService],
})
export class LeadsModule {}
