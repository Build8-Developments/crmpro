import { Injectable } from '@nestjs/common';
import { BullService } from './bull/bull.service';
import { JobsHealthStatus } from './bull/bull.types';
import { ExportProcessor } from './processors/export.processor';
import { ImportProcessor } from './processors/import.processor';

@Injectable()
export class JobsHealthService {
  constructor(
    private readonly bullService: BullService,
    private readonly importProcessor: ImportProcessor,
    private readonly exportProcessor: ExportProcessor,
  ) {}

  async getHealth(): Promise<JobsHealthStatus> {
    const redisUp = await this.bullService.pingRedis();
    const queuesHealthy = this.bullService.areQueuesRegistered();
    const workersRunning =
      this.importProcessor.isRunning() && this.exportProcessor.isRunning();

    return {
      redis: redisUp ? 'up' : 'down',
      queues: queuesHealthy ? 'healthy' : 'unhealthy',
      workers: workersRunning ? 'running' : 'stopped',
    };
  }
}
