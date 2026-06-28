import { Injectable } from '@nestjs/common';
import { HttpMetricsStore } from '../../../common/logging/http-metrics.store';
import { JobsHealthService } from '../../jobs/jobs-health.service';
import { NotificationMetricsStore } from '../../notifications/metrics/notification-metrics.store';
import { MetricsData } from '../monitoring.types';
import { QueueMetricsService } from './queue-metrics.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly httpMetricsStore: HttpMetricsStore,
    private readonly queueMetricsService: QueueMetricsService,
    private readonly jobsHealthService: JobsHealthService,
    private readonly notificationMetricsStore: NotificationMetricsStore,
  ) {}

  async getMetrics(): Promise<MetricsData> {
    const [queues, jobsHealth] = await Promise.all([
      this.queueMetricsService.getQueueMetrics(),
      this.jobsHealthService.getHealth(),
    ]);

    const notificationMetrics = this.notificationMetricsStore.getSnapshot();

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
