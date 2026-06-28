import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CleanupJobName } from '../cleanup/cleanup.constants';
import { CleanupSchedulerService } from '../cleanup/cleanup-scheduler.service';
import { QueueService } from '../jobs/queues/queue.service';

describe('Cleanup queue registration', () => {
  let queueService: {
    registerCleanupRepeatableJob: jest.Mock;
  };
  let scheduler: CleanupSchedulerService;

  beforeEach(async () => {
    queueService = {
      registerCleanupRepeatableJob: jest.fn().mockResolvedValue(undefined),
    };

    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'cleanup.schedules.uploadIntentsIntervalMs': 3_600_000,
          'cleanup.schedules.staleJobsIntervalMs': 900_000,
          'cleanup.schedules.sessionsIntervalMs': 86_400_000,
          'cleanup.schedules.orphanS3Cron': '0 3 * * *',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupSchedulerService,
        { provide: QueueService, useValue: queueService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    scheduler = module.get(CleanupSchedulerService);
  });

  it('registers all cleanup repeatable jobs', async () => {
    await scheduler.registerRepeatableJobs();

    expect(queueService.registerCleanupRepeatableJob).toHaveBeenCalledWith(
      CleanupJobName.FILE_UPLOAD_INTENTS,
      { every: 3_600_000 },
    );
    expect(queueService.registerCleanupRepeatableJob).toHaveBeenCalledWith(
      CleanupJobName.STALE_IMPORT_JOBS,
      { every: 900_000 },
    );
    expect(queueService.registerCleanupRepeatableJob).toHaveBeenCalledWith(
      CleanupJobName.STALE_EXPORT_JOBS,
      { every: 900_000 },
    );
    expect(queueService.registerCleanupRepeatableJob).toHaveBeenCalledWith(
      CleanupJobName.EXPIRED_SESSIONS,
      { every: 86_400_000 },
    );
    expect(queueService.registerCleanupRepeatableJob).toHaveBeenCalledWith(
      CleanupJobName.ORPHAN_S3_OBJECTS,
      { pattern: '0 3 * * *' },
    );
  });
});
