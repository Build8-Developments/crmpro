import { Injectable, Logger } from '@nestjs/common';
import { BullService } from '../bull/bull.service';
import { CLEANUP_QUEUE, EXPORT_QUEUE, IMPORT_QUEUE } from '../bull/bull.constants';
import { BackgroundJobPayload } from '../bull/bull.types';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly bullService: BullService) {}

  async enqueueImportJob(jobId: string): Promise<void> {
    const payload: BackgroundJobPayload = { jobId };

    await this.bullService.getQueue(IMPORT_QUEUE).add('process-import', payload, {
      jobId: `import:${jobId}`,
    });

    this.logger.log(`Import queued: jobId=${jobId}`);
  }

  async enqueueExportJob(jobId: string): Promise<void> {
    const payload: BackgroundJobPayload = { jobId };

    await this.bullService.getQueue(EXPORT_QUEUE).add('process-export', payload, {
      jobId: `export:${jobId}`,
    });

    this.logger.log(`Export queued: jobId=${jobId}`);
  }

  async enqueueCleanupJob(type: string): Promise<void> {
    await this.bullService.getQueue(CLEANUP_QUEUE).add('cleanup', { type });
    this.logger.log(`Cleanup queued: type=${type}`);
  }
}
