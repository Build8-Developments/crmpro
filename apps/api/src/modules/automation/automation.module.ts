import { Module, forwardRef } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { LeadsModule } from '../leads/leads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TasksModule } from '../tasks/tasks.module';
import {
  AssignAgentActionHandler,
  CreateActivityActionHandler,
  CreateNoteActionHandler,
  CreateNotificationActionHandler,
  DelayActionHandler,
  MoveStageActionHandler,
  RemoveTagActionHandler,
  TagActionHandler,
  UnsupportedActionHandler,
} from './actions/automation-action.handlers';
import { CreateTaskActionHandler } from './actions/create-task.action.handler';
import { AutomationActionService } from './automation-action.service';
import { AutomationConditionService } from './automation-condition.service';
import { AutomationController } from './automation.controller';
import { AutomationQueueService } from './automation-queue.service';
import { AutomationRunnerService } from './automation-runner.service';
import { AutomationTemplateService } from './automation-template.service';
import { AutomationTriggerService } from './automation-trigger.service';
import { AutomationService } from './automation.service';
import { AutomationMetricsStore } from './metrics/automation-metrics.store';
import { AutomationProcessor } from './workers/automation.processor';

@Module({
  imports: [AuthRbacModule, NotificationsModule, LeadsModule, forwardRef(() => TasksModule)],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    AutomationRunnerService,
    AutomationTriggerService,
    AutomationActionService,
    AutomationConditionService,
    AutomationTemplateService,
    AutomationQueueService,
    AutomationMetricsStore,
    AutomationProcessor,
    CreateNotificationActionHandler,
    AssignAgentActionHandler,
    MoveStageActionHandler,
    CreateNoteActionHandler,
    CreateActivityActionHandler,
    CreateTaskActionHandler,
    DelayActionHandler,
    TagActionHandler,
    RemoveTagActionHandler,
    UnsupportedActionHandler,
  ],
  exports: [
    AutomationTriggerService,
    AutomationMetricsStore,
    AutomationProcessor,
  ],
})
export class AutomationModule {}
