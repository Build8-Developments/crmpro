import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
import { TenantAccessModule } from '../../common/tenant-access/tenant-access.module';
import { InAppNotificationChannel } from './channels/in-app-notification.channel';
import { NotificationMetricsStore } from './metrics/notification-metrics.store';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationTriggerService } from './notification-trigger.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailNotificationChannel } from './channels/email-notification.channel';

@Module({
  imports: [AuthRbacModule, TenantAccessModule],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    EmailNotificationChannel,
    NotificationsService,
    NotificationPreferencesService,
    NotificationTemplateService,
    NotificationDeliveryService,
    NotificationQueueService,
    NotificationTriggerService,
    NotificationMetricsStore,
    InAppNotificationChannel,
  ],
  exports: [
    NotificationTriggerService,
    NotificationMetricsStore,
    NotificationDeliveryService,
  ],
})
export class NotificationsModule {}
