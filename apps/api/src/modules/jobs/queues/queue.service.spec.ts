import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { BullService } from '../bull/bull.service';
import {
  CLEANUP_QUEUE,
  EXPORT_QUEUE,
  IMPORT_QUEUE,
} from '../bull/bull.constants';
import { QueueService } from './queue.service';

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn(),
}));

jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue(undefined),
  })),
);

describe('QueueService', () => {
  let queueService: QueueService;
  let importQueue: { add: jest.Mock };
  let exportQueue: { add: jest.Mock };
  let cleanupQueue: { add: jest.Mock };

  beforeEach(async () => {
    importQueue = { add: jest.fn().mockResolvedValue(undefined), close: jest.fn() };
    exportQueue = { add: jest.fn().mockResolvedValue(undefined), close: jest.fn() };
    cleanupQueue = { add: jest.fn().mockResolvedValue(undefined), close: jest.fn() };

    const bullService = {
      getQueue: jest.fn((name: string) => {
        if (name === IMPORT_QUEUE) return importQueue;
        if (name === EXPORT_QUEUE) return exportQueue;
        if (name === CLEANUP_QUEUE) return cleanupQueue;
        throw new Error(`Unknown queue ${name}`);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: BullService, useValue: bullService },
      ],
    }).compile();

    queueService = module.get(QueueService);
  });

  it('enqueues import jobs with jobId payload only', async () => {
    await queueService.enqueueImportJob('job-123');

    expect(importQueue.add).toHaveBeenCalledWith(
      'process-import',
      { jobId: 'job-123' },
      { jobId: 'import:job-123' },
    );
  });

  it('enqueues export jobs with jobId payload only', async () => {
    await queueService.enqueueExportJob('job-456');

    expect(exportQueue.add).toHaveBeenCalledWith(
      'process-export',
      { jobId: 'job-456' },
      { jobId: 'export:job-456' },
    );
  });

  it('enqueues cleanup jobs by type', async () => {
    await queueService.enqueueCleanupJob('expired-upload-intents');

    expect(cleanupQueue.add).toHaveBeenCalledWith('cleanup', {
      type: 'expired-upload-intents',
    });
  });
});

describe('BullService queue registration', () => {
  it('registers default job retry policy', async () => {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'redis.host': 'localhost',
          'redis.port': 6379,
          'bull.prefix': 'crmpro-test',
          'bull.jobAttempts': 3,
          'bull.jobBackoffDelayMs': 3000,
        };
        return values[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'redis.host': 'localhost',
          'redis.port': 6379,
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BullService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    const bullService = module.get(BullService);
    bullService.onModuleInit();

    expect(Queue).toHaveBeenCalledTimes(3);
    expect(bullService.getDefaultJobOptions()).toEqual({
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    await bullService.onModuleDestroy();
  });
});
