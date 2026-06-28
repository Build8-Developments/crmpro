import { Injectable } from '@nestjs/common';
import { HttpMetricsStore } from '../../../common/logging/http-metrics.store';
import { JobsHealthService } from '../../jobs/jobs-health.service';
import { MetricsData } from '../monitoring.types';
import { QueueMetricsService } from './queue-metrics.service';

@Injectable()
export class MetricsService {
  constructor(
    private readonly httpMetricsStore: HttpMetricsStore,
    private readonly queueMetricsService: QueueMetricsService,
    private readonly jobsHealthService: JobsHealthService,
  ) {}

  async getMetrics(): Promise<MetricsData> {
    const [queues, jobsHealth] = await Promise.all([
      this.queueMetricsService.getQueueMetrics(),
      this.jobsHealthService.getHealth(),
    ]);

    return {
      http: this.httpMetricsStore.getSnapshot(),
      queues,
      workers: jobsHealth.workers,
    };
  }
}
