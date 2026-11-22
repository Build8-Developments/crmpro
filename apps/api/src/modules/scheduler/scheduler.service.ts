import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { BullService } from '../jobs/bull/bull.service';

export const SCHEDULER_QUEUE = 'scheduler';

export interface ScheduledJobDefinition {
  /** Unique name; also the BullMQ job-scheduler id. */
  name: string;
  everyMs: number;
  run: () => Promise<void>;
}

/** A held claim; `release` frees it early (no-op once someone else holds it). */
export interface SchedulerClaim {
  release: () => Promise<void>;
}

const CLAIM_KEY_PREFIX = 'scheduler:claim';

// Delete the key only while it still holds our token (it may have expired and
// been claimed by another instance in the meantime).
const RELEASE_SCRIPT = `if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0`;

/**
 * Registry for periodic background scans (rules sweep, task reminders).
 * Modules register handlers in `onModuleInit`; after boot each handler becomes
 * a BullMQ job scheduler on one shared queue, so with several API instances a
 * tick still runs exactly once (whichever worker picks it up). `claim` covers
 * work that must not overlap across ticks or instances (per-tenant passes).
 */
@Injectable()
export class SchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SchedulerService.name);
  private readonly jobs = new Map<string, ScheduledJobDefinition>();
  private queue?: Queue;
  private worker?: Worker;
  private redis?: Redis;

  constructor(private readonly bullService: BullService) {}

  register(definition: ScheduledJobDefinition): void {
    if (this.jobs.has(definition.name)) {
      throw new Error(`Scheduled job "${definition.name}" already registered`);
    }
    this.jobs.set(definition.name, definition);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (this.jobs.size === 0 || process.env.NODE_ENV === 'test') return;

    const connection = this.bullService.getConnectionOptions();
    const prefix = this.bullService.getPrefix();
    this.queue = new Queue(SCHEDULER_QUEUE, { connection, prefix });

    for (const job of this.jobs.values()) {
      // Idempotent: re-registering on every boot updates, never duplicates.
      await this.queue.upsertJobScheduler(
        job.name,
        { every: job.everyMs },
        { name: job.name, opts: { removeOnComplete: true, removeOnFail: 50 } },
      );
    }

    this.worker = new Worker(
      SCHEDULER_QUEUE,
      async (job) => {
        const definition = this.jobs.get(job.name);
        if (definition) await definition.run();
      },
      { connection, prefix, concurrency: 1 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Scheduled job ${job?.name ?? 'unknown'} failed: ${error.message}`,
      );
    });

    this.logger.log(`Scheduler started: ${[...this.jobs.keys()].join(', ')}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    if (this.redis) {
      await this.redis.quit();
      this.redis = undefined;
    }
  }

  /**
   * Cross-instance "only one of us does this": SET NX with a TTL. Returns
   * null when someone else holds the key. A claim that is never released
   * simply expires, so it doubles as a "done recently" marker or a throttle.
   */
  async claim(key: string, ttlSeconds: number): Promise<SchedulerClaim | null> {
    const redis = this.getRedis();
    const fullKey = `${CLAIM_KEY_PREFIX}:${key}`;
    const token = randomUUID();
    const result = await redis.set(fullKey, token, 'EX', ttlSeconds, 'NX');
    if (result !== 'OK') return null;
    return {
      release: async () => {
        await redis.eval(RELEASE_SCRIPT, 1, fullKey, token);
      },
    };
  }

  private getRedis(): Redis {
    if (!this.redis) {
      this.redis = new Redis(this.bullService.getConnectionOptions());
      this.redis.on('error', (error: Error) => {
        this.logger.error(`Scheduler Redis error: ${error.message}`);
      });
    }
    return this.redis;
  }

  isRunning(): boolean {
    return this.worker?.isRunning() ?? false;
  }
}
