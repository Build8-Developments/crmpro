import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { ImportJobsService } from '../../import-jobs/import-jobs.service';
import { BullService } from '../bull/bull.service';
import { IMPORT_QUEUE } from '../bull/bull.constants';
import { BackgroundJobPayload } from '../bull/bull.types';

@Injectable()
export class ImportProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportProcessor.name);
  private worker?: Worker<BackgroundJobPayload>;

  constructor(
    private readonly bullService: BullService,
    private readonly importJobsService: ImportJobsService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<BackgroundJobPayload>(
      IMPORT_QUEUE,
      async (job) => this.handleJob(job),
      {
        connection: this.bullService.getConnectionOptions(),
        prefix: this.bullService.getPrefix(),
        concurrency: this.bullService.getImportConcurrency(),
      },
    );

    this.worker.on('active', (job) => {
      this.logger.log(`Import started: jobId=${job.data.jobId}`);
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Import completed: jobId=${job.data.jobId}`);
    });

    this.worker.on('failed', (job, error) => {
      const jobId = job?.data.jobId ?? 'unknown';
      this.logger.error(
        `Import failed: jobId=${jobId} error=${error.message}`,
      );

      if (job && this.hasExhaustedRetries(job)) {
        void this.importJobsService.failImportJobIfActive(
          job.data.jobId,
          error.message,
        );
      }
    });

    this.logger.log('Import worker started');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = undefined;
      this.logger.log('Import worker stopped');
    }
  }

  isRunning(): boolean {
    return this.worker?.isRunning() ?? false;
  }

  private async handleJob(job: Job<BackgroundJobPayload>): Promise<void> {
    await this.importJobsService.processImportJob(job.data.jobId);
  }

  private hasExhaustedRetries(job: Job<BackgroundJobPayload>): boolean {
    const maxAttempts = job.opts.attempts ?? this.bullService.getDefaultJobOptions()?.attempts ?? 3;
    return job.attemptsMade >= maxAttempts;
  }
}
