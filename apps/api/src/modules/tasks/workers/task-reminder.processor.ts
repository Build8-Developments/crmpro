import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { WorkerLoggingService } from '../../../common/logging/worker-logging.service';
import { BullService } from '../../jobs/bull/bull.service';
import { TASK_QUEUE } from '../../jobs/bull/bull.constants';
import { DEFAULT_OVERDUE_SCAN_INTERVAL_MS, TASK_OVERDUE_SCAN_JOB } from '../tasks.constants';
import { TaskJobPayload } from '../entities/task.types';
import { TaskReminderService } from '../task-reminder.service';

@Injectable()
export class TaskReminderProcessor implements OnModuleInit, OnModuleDestroy {
  private worker?: Worker<TaskJobPayload>;
  private readonly jobStartTimes = new Map<string, number>();

  constructor(
    private readonly bullService: BullService,
    private readonly reminderService: TaskReminderService,
    private readonly workerLoggingService: WorkerLoggingService,
  ) {}

  onModuleInit(): void {
    this.worker = new Worker<TaskJobPayload>(
      TASK_QUEUE,
      async (job) => this.handleJob(job),
      {
        connection: this.bullService.getConnectionOptions(),
        prefix: this.bullService.getPrefix(),
        concurrency: this.bullService.getTaskConcurrency(),
      },
    );

    this.worker.on('active', (job) => {
      this.jobStartTimes.set(job.id!, Date.now());
      if (job.attemptsMade === 0) {
        this.workerLoggingService.started(this.buildContext(job));
      }
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

    void this.bullService.getQueue(TASK_QUEUE).add(
      TASK_OVERDUE_SCAN_JOB,
      { taskId: 'scan', tenantId: 'system', jobType: 'OVERDUE_SCAN' },
      {
        jobId: 'repeat:task:overdue-scan',
        repeat: { every: DEFAULT_OVERDUE_SCAN_INTERVAL_MS },
      },
    );
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

  private async handleJob(job: Job<TaskJobPayload>): Promise<void> {
    await this.reminderService.processJob(job.data);
  }

  private buildContext(job: Job<TaskJobPayload>) {
    return {
      queue: TASK_QUEUE,
      jobId: `${job.data.jobType}:${job.data.taskId}`,
      requestId: job.data.requestId,
      attempts: job.attemptsMade + 1,
    };
  }

  private getDurationMs(workerJobId: string): number | undefined {
    const startedAt = this.jobStartTimes.get(workerJobId);
    return startedAt ? Date.now() - startedAt : undefined;
  }
}
