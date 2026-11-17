import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { TenantModule } from '../../common/tenant/tenant.module';
import { LeadActivityModule } from '../leads/lead-activity.module';
import { LeadScopeModule } from '../leads/scope/lead-scope.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { LeadInteractionsController } from './lead-interactions.controller';
import { LeadInteractionsService } from './lead-interactions.service';
import { TaskRemindersService } from './task-reminders.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    AuthRbacModule,
    TenantModule,
    LeadActivityModule,
    LeadScopeModule,
    NotificationsModule,
    SchedulerModule,
  ],
  controllers: [TasksController, LeadInteractionsController],
  providers: [TasksService, LeadInteractionsService, TaskRemindersService],
  exports: [TasksService],
})
export class TasksModule {}
