import { Test, TestingModule } from '@nestjs/testing';
import { CleanupProcessor } from '../cleanup/workers/cleanup.processor';
import { NotificationProcessor } from '../notifications/workers/notification.processor';
import { BullService } from './bull/bull.service';
import { JobsHealthProvider } from './jobs-health.provider';
import { ExportProcessor } from './processors/export.processor';
import { ImportProcessor } from './processors/import.processor';

describe('JobsHealthProvider', () => {
  it('returns healthy status when redis, queues, and workers are up', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsHealthProvider,
        {
          provide: BullService,
          useValue: {
            pingRedis: jest.fn().mockResolvedValue(true),
            areQueuesRegistered: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: ImportProcessor,
          useValue: { isRunning: jest.fn().mockReturnValue(true) },
        },
        {
          provide: ExportProcessor,
          useValue: { isRunning: jest.fn().mockReturnValue(true) },
        },
        {
          provide: CleanupProcessor,
          useValue: { isRunning: jest.fn().mockReturnValue(true) },
        },
        {
          provide: NotificationProcessor,
          useValue: { isRunning: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    const provider = module.get(JobsHealthProvider);
    await expect(provider.getHealth()).resolves.toEqual({
      redis: 'up',
      queues: 'healthy',
      workers: {
        import: 'running',
        export: 'running',
        cleanup: 'running',
        notification: 'running',
      },
    });
  });

  it('returns unhealthy status when redis is down', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsHealthProvider,
        {
          provide: BullService,
          useValue: {
            pingRedis: jest.fn().mockResolvedValue(false),
            areQueuesRegistered: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: ImportProcessor,
          useValue: { isRunning: jest.fn().mockReturnValue(true) },
        },
        {
          provide: ExportProcessor,
          useValue: { isRunning: jest.fn().mockReturnValue(true) },
        },
        {
          provide: CleanupProcessor,
          useValue: { isRunning: jest.fn().mockReturnValue(true) },
        },
        {
          provide: NotificationProcessor,
          useValue: { isRunning: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    const provider = module.get(JobsHealthProvider);
    await expect(provider.getHealth()).resolves.toEqual({
      redis: 'down',
      queues: 'healthy',
      workers: {
        import: 'running',
        export: 'running',
        cleanup: 'running',
        notification: 'running',
      },
    });
  });
});
