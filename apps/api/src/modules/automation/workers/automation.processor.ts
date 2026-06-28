import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { WorkerLoggingService } from '../../../common/logging/worker-logging.service';
import { BullService } from '../../jobs/bull/bull.service';
import { AUTOMATION_QUEUE } from '../../jobs/bull/bull.constants';
import { AutomationRunnerService } from '../automation-runner.service';
import { AutomationJobPayload } from '../entities/automation.types';

@Injectable()
export class AutomationProcessor implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<AutomationJobPayload>;
  private readonly jobStartTimes = new Map<string, number>();

  constructor(
    private readonly bullService: BullService,
    private readonly runnerService: AutomationRunnerService,
    private readonly workerLoggingService: WorkerLoggingService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<AutomationJobPayload>(
      AUTOMATION_QUEUE,
      async (job) => this.handleJob(job),
      {
        connection: this.bullService.getConnectionOptions(),
        prefix: this.bullService.getPrefix(),
        concurrency: this.bullService.getAutomationConcurrency(),
      },
    );

    this.worker.on('active', (job) => {
      this.jobStartTimes.set(job.id!, Date.now());
      const context = this.buildContext(job);

      if (job.attemptsMade > 0) {
        this.workerLoggingService.retry(context);
        return;
      }

      this.workerLoggingService.started(context);
    });

    this.worker.on('completed', (job) => {
      this.workerLoggingService.completed({
        ...this.buildContext(job),
        durationMs: this.getDurationMs(job.id!),
      });
      this.jobStartTimes.delete(job.id!);
    });

    this.worker.on('failed', (job, error) => {
      if (!job) {
        return;
      }

      this.workerLoggingService.failed({
        ...this.buildContext(job),
        durationMs: this.getDurationMs(job.id!),
        metadata: { error: error.message },
      });
      this.jobStartTimes.delete(job.id!);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = undefined;
    }
  }

  isRunning(): boolean {
    return this.worker?.isRunning() ?? false;
  }

  private async handleJob(job: Job<AutomationJobPayload>): Promise<void> {
    await this.runnerService.run(job.data);
  }

  private buildContext(job: Job<AutomationJobPayload>) {
    return {
      queue: AUTOMATION_QUEUE,
      jobId: `${job.data.workflowId}:${job.data.entityId}`,
      requestId: job.data.requestId,
      attempts: job.attemptsMade + 1,
    };
  }

  private getDurationMs(workerJobId: string): number | undefined {
    const startedAt = this.jobStartTimes.get(workerJobId);
    return startedAt ? Date.now() - startedAt : undefined;
  }
}
