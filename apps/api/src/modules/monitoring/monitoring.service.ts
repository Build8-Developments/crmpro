import { Injectable } from '@nestjs/common';
import { JobsHealthService } from '../jobs/jobs-health.service';
import { GlobalHealthData, JobsHealthData, MetricsData } from './monitoring.types';
import { HealthCheckService } from './health/health-check.service';
import { MetricsService } from './metrics/metrics.service';

@Injectable()
export class MonitoringService {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly jobsHealthService: JobsHealthService,
    private readonly metricsService: MetricsService,
  ) {}

  getGlobalHealth(): Promise<GlobalHealthData> {
    return this.healthCheckService.getGlobalHealth();
  }

  getJobsHealth(): Promise<JobsHealthData> {
    return this.jobsHealthService.getHealth();
  }

  getMetrics(): Promise<MetricsData> {
    return this.metricsService.getMetrics();
  }
}
