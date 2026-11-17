import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { BullService } from '../jobs/bull/bull.service';

export const SCHEDULER_QUEUE = 'scheduler';

export interface ScheduledJobDefinition {
  /** Unique job name; also the BullMQ repeat job id. */
  name: string;
  everyMs: number;
  run: () => Promise<void>;
}

/**
 * Small registry for periodic background scans (follow-up reminders, SLA
 * checks). Modules register handlers in `onModuleInit`; once the app has
 * booted, each handler becomes a BullMQ repeatable job on one shared queue, so
 * with several API instances every tick still runs exactly once.
 */
@Injectable()
export class SchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SchedulerService.name);
  private readonly jobs = new Map<string, ScheduledJobDefinition>();
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly bullService: BullService) {}

  register(definition: ScheduledJobDefinition): void {
    if (this.jobs.has(definition.name)) {
      throw new Error(`Scheduled job "${definition.name}" already registered`);
    }

    this.jobs.set(definition.name, definition);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (this.jobs.size === 0) {
      return;
    }

    const connection = this.bullService.getConnectionOptions();
    const prefix = this.bullService.getPrefix();

    this.queue = new Queue(SCHEDULER_QUEUE, { connection, prefix });

    for (const job of this.jobs.values()) {
      await this.queue.add(
        job.name,
        {},
        {
          jobId: `repeat-${job.name}`,
          repeat: { every: job.everyMs },
          removeOnComplete: true,
          removeOnFail: 50,
        },
      );
    }

    this.worker = new Worker(
      SCHEDULER_QUEUE,
      async (job) => {
        const definition = this.jobs.get(job.name);

        if (!definition) {
          return;
        }

        await definition.run();
      },
      { connection, prefix, concurrency: 1 },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Scheduled job ${job?.name ?? 'unknown'} failed: ${error.message}`,
      );
    });

    this.logger.log(
      `Scheduler started with ${this.jobs.size} job(s): ${[...this.jobs.keys()].join(', ')}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  isRunning(): boolean {
    return this.worker?.isRunning() ?? false;
  }
}
