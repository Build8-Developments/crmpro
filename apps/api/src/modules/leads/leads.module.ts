import { Module, forwardRef } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationModule } from '../automation/automation.module';
import { FilesModule } from '../files/files.module';
import { LeadNotesController } from './lead-notes.controller';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadAccessService } from './services/lead-access.service';
import { LeadActivityService } from './services/lead-activity.service';
import { LeadAssignmentService } from './services/lead-assignment.service';
import { LeadNotesService } from './services/lead-notes.service';
import { LeadStageService } from './services/lead-stage.service';
import { LeadTimelineService } from './services/lead-timeline.service';

@Module({
  imports: [AuthRbacModule, AnalyticsModule, NotificationsModule, forwardRef(() => AutomationModule), forwardRef(() => FilesModule)],
  controllers: [LeadsController, LeadNotesController],
  providers: [
    LeadsService,
    LeadActivityService,
    LeadStageService,
    LeadAssignmentService,
    LeadAccessService,
    LeadNotesService,
    LeadTimelineService,
  ],
  exports: [LeadActivityService, LeadsService],
})
export class LeadsModule {}
