import { Injectable } from '@nestjs/common';
import {
  JobsHealthProvider as IJobsHealthProvider,
  JobsHealthSnapshot,
} from '../../common/health';
import { CleanupProcessor } from '../cleanup/workers/cleanup.processor';
import { NotificationProcessor } from '../notifications/workers/notification.processor';
import { BullService } from './bull/bull.service';
import { ExportProcessor } from './processors/export.processor';
import { ImportProcessor } from './processors/import.processor';

@Injectable()
export class JobsHealthProvider implements IJobsHealthProvider {
  constructor(
    private readonly bullService: BullService,
    private readonly importProcessor: ImportProcessor,
    private readonly exportProcessor: ExportProcessor,
    private readonly cleanupProcessor: CleanupProcessor,
    private readonly notificationProcessor: NotificationProcessor,
  ) {}

  async getHealth(): Promise<JobsHealthSnapshot> {
    const redisUp = await this.bullService.pingRedis();
    const queuesHealthy = this.bullService.areQueuesRegistered();

    return {
      redis: redisUp ? 'up' : 'down',
      queues: queuesHealthy ? 'healthy' : 'unhealthy',
      workers: {
        import: this.importProcessor.isRunning() ? 'running' : 'stopped',
        export: this.exportProcessor.isRunning() ? 'running' : 'stopped',
        cleanup: this.cleanupProcessor.isRunning() ? 'running' : 'stopped',
        notification: this.notificationProcessor.isRunning()
          ? 'running'
          : 'stopped',
      },
    };
  }
}
