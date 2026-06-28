import { Injectable } from '@nestjs/common';
import { HttpMetricsStore } from '../../../common/logging/http-metrics.store';
import { AutomationMetricsStore } from '../../automation/metrics/automation-metrics.store';
import { JobsHealthService } from '../../jobs/jobs-health.service';
import { NotificationMetricsStore } from '../../notifications/metrics/notification-metrics.store';
import { TaskMetricsStore } from '../../tasks/metrics/task-metrics.store';
import { MetricsData } from '../monitoring.types';
import { QueueMetricsService } from './queue-metrics.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly httpMetricsStore: HttpMetricsStore,
    private readonly queueMetricsService: QueueMetricsService,
    private readonly jobsHealthService: JobsHealthService,
    private readonly notificationMetricsStore: NotificationMetricsStore,
    private readonly automationMetricsStore: AutomationMetricsStore,
    private readonly taskMetricsStore: TaskMetricsStore,
  ) {}

  async getMetrics(): Promise<MetricsData> {
    const [queues, jobsHealth] = await Promise.all([
      this.queueMetricsService.getQueueMetrics(),
      this.jobsHealthService.getHealth(),
    ]);

    const notificationMetrics = this.notificationMetricsStore.getSnapshot();
    const automationMetrics = this.automationMetricsStore.getSnapshot();
    const taskMetrics = this.taskMetricsStore.getSnapshot();

    return {
      http: this.httpMetricsStore.getSnapshot(),
      queues,
      notifications: {
        ...notificationMetrics,
        unreadCount: queues.notification.waiting + queues.notification.active,
      },
      automation: automationMetrics,
      tasks: taskMetrics,
      workers: jobsHealth.workers,
    };
  }
}
