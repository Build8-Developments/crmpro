import { Module, forwardRef } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { AutomationModule } from '../automation/automation.module';
import { LeadsModule } from '../leads/leads.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { TaskMetricsStore } from './metrics/task-metrics.store';
import { TaskNotificationService } from './task-notification.service';
import { TaskQueueService } from './task-queue.service';
import { TaskReminderService } from './task-reminder.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskReminderProcessor } from './workers/task-reminder.processor';

@Module({
  imports: [
    AuthRbacModule,
    LeadsModule,
    NotificationsModule,
    forwardRef(() => AutomationModule),
  ],
  controllers: [TasksController, CalendarController],
  providers: [
    TasksService,
    CalendarService,
    TaskReminderService,
    TaskNotificationService,
    TaskQueueService,
    TaskMetricsStore,
    TaskReminderProcessor,
  ],
  exports: [TasksService, TaskMetricsStore, TaskReminderProcessor],
})
export class TasksModule {}
