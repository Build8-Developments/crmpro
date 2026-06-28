import { Injectable } from '@nestjs/common';
import {
  AUTOMATION_QUEUE,
  CLEANUP_QUEUE,
  EXPORT_QUEUE,
  IMPORT_QUEUE,
  NOTIFICATION_QUEUE,
  TASK_QUEUE,
  QueueName,
} from '../../jobs/bull/bull.constants';
import { BullService } from '../../jobs/bull/bull.service';
import { QueueMetricsSnapshot } from '../monitoring.types';

@Injectable()
export class QueueMetricsService {
  constructor(private readonly bullService: BullService) {}

  async getQueueMetrics(): Promise<{
    import: QueueMetricsSnapshot;
    export: QueueMetricsSnapshot;
    cleanup: QueueMetricsSnapshot;
    notification: QueueMetricsSnapshot;
    automation: QueueMetricsSnapshot;
    task: QueueMetricsSnapshot;
  }> {
    const [
      importCounts,
      exportCounts,
      cleanupCounts,
      notificationCounts,
      automationCounts,
      taskCounts,
    ] = await Promise.all([
      this.getCounts(IMPORT_QUEUE),
      this.getCounts(EXPORT_QUEUE),
      this.getCounts(CLEANUP_QUEUE),
      this.getCounts(NOTIFICATION_QUEUE),
      this.getCounts(AUTOMATION_QUEUE),
      this.getCounts(TASK_QUEUE),
    ]);

    return {
      import: importCounts,
      export: exportCounts,
      cleanup: cleanupCounts,
      notification: notificationCounts,
      automation: automationCounts,
      task: taskCounts,
    };
  }

  private async getCounts(queueName: QueueName): Promise<QueueMetricsSnapshot> {
    const counts = await this.bullService.getQueue(queueName).getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
    );

    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
    };
  }
}
