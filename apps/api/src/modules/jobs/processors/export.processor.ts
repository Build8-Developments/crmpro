import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ExportJobsService } from '../../export-jobs/services/export-jobs.service';
import { BullService } from '../bull/bull.service';
import { EXPORT_QUEUE } from '../bull/bull.constants';
import { BackgroundJobPayload } from '../bull/bull.types';

@Injectable()
export class ExportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExportProcessor.name);
  private worker?: Worker<BackgroundJobPayload>;

  constructor(
    private readonly bullService: BullService,
    private readonly exportJobsService: ExportJobsService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<BackgroundJobPayload>(
      EXPORT_QUEUE,
      async (job) => this.handleJob(job),
      {
        connection: this.bullService.getConnectionOptions(),
        prefix: this.bullService.getPrefix(),
        concurrency: this.bullService.getExportConcurrency(),
      },
    );

    this.worker.on('active', (job) => {
      this.logger.log(`Export started: jobId=${job.data.jobId}`);
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Export completed: jobId=${job.data.jobId}`);
    });

    this.worker.on('failed', (job, error) => {
      const jobId = job?.data.jobId ?? 'unknown';
      this.logger.error(
        `Export failed: jobId=${jobId} error=${error.message}`,
      );

      if (job && this.hasExhaustedRetries(job)) {
        void this.exportJobsService.failExportJobIfActive(
          job.data.jobId,
          error.message,
        );
      }
    });

    this.logger.log('Export worker started');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = undefined;
      this.logger.log('Export worker stopped');
    }
  }

  isRunning(): boolean {
    return this.worker?.isRunning() ?? false;
  }

  private async handleJob(job: Job<BackgroundJobPayload>): Promise<void> {
    await this.exportJobsService.processExportJob(job.data.jobId);
  }

  private hasExhaustedRetries(job: Job<BackgroundJobPayload>): boolean {
    const maxAttempts = job.opts.attempts ?? this.bullService.getDefaultJobOptions()?.attempts ?? 3;
    return job.attemptsMade >= maxAttempts;
  }
}
