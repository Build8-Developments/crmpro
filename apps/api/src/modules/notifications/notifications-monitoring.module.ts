import { Module } from '@nestjs/common';
import { NOTIFICATION_METRICS_PROVIDER } from '../../common/health';
import { NotificationsModule } from './notifications.module';
import { NotificationMetricsProvider } from './notification-metrics.provider';

@Module({
  imports: [NotificationsModule],
  providers: [
    NotificationMetricsProvider,
    {
      provide: NOTIFICATION_METRICS_PROVIDER,
      useExisting: NotificationMetricsProvider,
    },
  ],
  exports: [NOTIFICATION_METRICS_PROVIDER],
})
export class NotificationsMonitoringModule {}
