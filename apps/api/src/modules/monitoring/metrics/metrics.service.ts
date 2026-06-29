import { Inject, Injectable } from '@nestjs/common';
import { HttpMetricsStore } from '../../../common/logging/http-metrics.store';
import {
  JOBS_HEALTH_PROVIDER,
  NOTIFICATION_METRICS_PROVIDER,
} from '../../../common/health';
import type {
  JobsHealthProvider,
  NotificationMetricsProvider,
} from '../../../common/health';
import { MetricsData } from '../monitoring.types';
import { QueueMetricsService } from './queue-metrics.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly httpMetricsStore: HttpMetricsStore,
    private readonly queueMetricsService: QueueMetricsService,
    @Inject(JOBS_HEALTH_PROVIDER)
    private readonly jobsHealthProvider: JobsHealthProvider,
    @Inject(NOTIFICATION_METRICS_PROVIDER)
    private readonly notificationMetricsProvider: NotificationMetricsProvider,
  ) {}

  async getMetrics(): Promise<MetricsData> {
    const [queues, jobsHealth] = await Promise.all([
      this.queueMetricsService.getQueueMetrics(),
      this.jobsHealthProvider.getHealth(),
    ]);

    const notificationMetrics = this.notificationMetricsProvider.getSnapshot();

    return {
      http: this.httpMetricsStore.getSnapshot(),
      queues,
      notifications: {
        ...notificationMetrics,
        unreadCount: queues.notification.waiting + queues.notification.active,
      },
      workers: jobsHealth.workers,
    };
  }
}
