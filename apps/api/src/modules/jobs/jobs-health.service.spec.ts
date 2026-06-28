import { Test, TestingModule } from '@nestjs/testing';
import { BullService } from './bull/bull.service';
import { JobsHealthService } from './jobs-health.service';
import { ExportProcessor } from './processors/export.processor';
import { ImportProcessor } from './processors/import.processor';

describe('JobsHealthService', () => {
  it('returns healthy status when redis, queues, and workers are up', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsHealthService,
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
      ],
    }).compile();

    const healthService = module.get(JobsHealthService);
    await expect(healthService.getHealth()).resolves.toEqual({
      redis: 'up',
      queues: 'healthy',
      workers: 'running',
    });
  });

  it('returns unhealthy status when redis is down', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsHealthService,
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
      ],
    }).compile();

    const healthService = module.get(JobsHealthService);
    await expect(healthService.getHealth()).resolves.toEqual({
      redis: 'down',
      queues: 'healthy',
      workers: 'running',
    });
  });
});
