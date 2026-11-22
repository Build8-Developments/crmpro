import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeadActivityModule } from '../leads/lead-activity.module';
import { TaskLifecycleService } from './common/task-lifecycle.service';
import { TenantClockService } from './common/tenant-clock.service';
import { InteractionsController } from './interactions/interactions.controller';
import { InteractionsService } from './interactions/interactions.service';
import { LostReasonsController } from './lost-reasons/lost-reasons.controller';
import { LostReasonsService } from './lost-reasons/lost-reasons.service';
import { TasksController } from './tasks/tasks.controller';
import { TasksService } from './tasks/tasks.service';
import { DealRulesService } from './rules/deal-rules.service';
import { LeadManagersService } from './rules/lead-managers.service';
import { LeadTimeRulesService } from './rules/lead-time-rules.service';
import { RuleTaskWriter } from './rules/rule-task-writer.service';
import { TaskRemindersService } from './rules/task-reminders.service';
import { WorkflowRulesService } from './rules/workflow-rules.service';
import { TodayController } from './today/today.controller';
import { TodayService } from './today/today.service';

/**
 * Workflow engine records: interactions (what was done), tasks (what must be
 * done next) and lost reasons. See docs/product/workflow-engine-spec.md.
 */
@Module({
  imports: [
    AuthRbacModule,
    LeadActivityModule,
    FilesModule,
    NotificationsModule,
  ],
  controllers: [
    InteractionsController,
    TasksController,
    LostReasonsController,
    TodayController,
  ],
  providers: [
    InteractionsService,
    TasksService,
    LostReasonsService,
    TaskLifecycleService,
    TenantClockService,
    LeadManagersService,
    RuleTaskWriter,
    LeadTimeRulesService,
    DealRulesService,
    WorkflowRulesService,
    TaskRemindersService,
    TodayService,
  ],
  exports: [
    TaskLifecycleService,
    TenantClockService,
    LostReasonsService,
    WorkflowRulesService,
    LeadManagersService,
    DealRulesService,
  ],
})
export class WorkflowModule {}
