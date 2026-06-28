import { Module } from '@nestjs/common';
import { AuthRbacModule } from '../../common/auth/auth-rbac.module';
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
import { NotificationProcessor } from './workers/notification.processor';

@Module({
  imports: [AuthRbacModule],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationPreferencesService,
    NotificationTemplateService,
    NotificationDeliveryService,
    NotificationQueueService,
    NotificationTriggerService,
    NotificationMetricsStore,
    InAppNotificationChannel,
    NotificationProcessor,
  ],
  exports: [NotificationTriggerService, NotificationMetricsStore, NotificationProcessor],
})
export class NotificationsModule {}
