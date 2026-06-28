import { Test, TestingModule } from '@nestjs/testing';
import { WorkerLoggingService } from '../../../common/logging/worker-logging.service';
import { BullService } from '../../jobs/bull/bull.service';
import { AutomationRunnerService } from '../automation-runner.service';
import { AutomationProcessor } from './automation.processor';

jest.mock('bullmq', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    isRunning: jest.fn().mockReturnValue(true),
  })),
}));

describe('AutomationProcessor', () => {
  it('delegates jobs to runner service', async () => {
    const runnerService = { run: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationProcessor,
        {
          provide: BullService,
          useValue: {
            getConnectionOptions: jest.fn().mockReturnValue({ host: 'localhost', port: 6379 }),
            getPrefix: jest.fn().mockReturnValue('crmpro'),
            getAutomationConcurrency: jest.fn().mockReturnValue(3),
          },
        },
        { provide: AutomationRunnerService, useValue: runnerService },
        {
          provide: WorkerLoggingService,
          useValue: {
            started: jest.fn(),
            completed: jest.fn(),
            failed: jest.fn(),
            retry: jest.fn(),
          },
        },
      ],
    }).compile();

    const processor = module.get(AutomationProcessor);
    processor.onModuleInit();

    await (
      processor as unknown as {
        handleJob: (job: { data: unknown; id: string; attemptsMade: number }) => Promise<void>;
      }
    ).handleJob({
      data: {
        workflowId: 'wf-1',
        tenantId: 'tenant-a',
        entityType: 'lead',
        entityId: 'lead-1',
        triggerType: 'LEAD_CREATED',
      },
      id: 'job-1',
      attemptsMade: 0,
    });

    expect(runnerService.run).toHaveBeenCalled();
    expect(processor.isRunning()).toBe(true);
  });
});
