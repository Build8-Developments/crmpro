import { ConfigService } from '@nestjs/config';
import { LoggingService } from './logging.service';
import { WorkerLoggingService } from './worker-logging.service';

describe('WorkerLoggingService', () => {
  it('logs worker lifecycle events when enabled', () => {
    const loggingService = { info: jest.fn(), error: jest.fn() };
    const configService = { get: jest.fn().mockReturnValue(true) };
    const service = new WorkerLoggingService(
      loggingService as unknown as LoggingService,
      configService as unknown as ConfigService,
    );

    service.started({
      queue: 'import-jobs',
      jobId: 'job-1',
      requestId: 'req-1',
      attempts: 1,
    });

    expect(loggingService.info).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'Worker',
        status: 'started',
        requestId: 'req-1',
      }),
    );
  });
});
