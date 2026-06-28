import { Test, TestingModule } from '@nestjs/testing';
import { AutomationExecutionStatus, AutomationTriggerType } from '@prisma/client';
import { LoggingService } from '../../common/logging/logging.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationActionService } from './automation-action.service';
import { AutomationConditionService } from './automation-condition.service';
import { AutomationRunnerService } from './automation-runner.service';
import { AutomationMetricsStore } from './metrics/automation-metrics.store';

describe('AutomationRunnerService', () => {
  let service: AutomationRunnerService;
  let prisma: {
    automationWorkflow: { findFirst: jest.Mock };
    automationExecution: { create: jest.Mock; update: jest.Mock };
    lead: { findFirst: jest.Mock };
  };
  let actionService: { executeAction: jest.Mock };
  let metricsStore: {
    recordSkipped: jest.Mock;
    recordSuccess: jest.Mock;
    recordPartial: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      automationWorkflow: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'wf-1',
          tenantId: 'tenant-a',
          name: 'Test',
          enabled: true,
          trigger: AutomationTriggerType.LEAD_CREATED,
          createdByUserId: 'user-1',
          conditions: [
            {
              id: 'c1',
              field: 'fullName',
              operator: 'EQUALS',
              value: 'Ahmed',
            },
          ],
          actions: [
            {
              id: 'a1',
              actionType: 'DELAY',
              configuration: { delayMs: 0 },
              executionOrder: 0,
            },
          ],
        }),
      },
      automationExecution: {
        create: jest.fn().mockResolvedValue({ id: 'exec-1' }),
        update: jest.fn().mockResolvedValue(undefined),
      },
      lead: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lead-1',
          fullName: 'Other',
          source: null,
          pipelineStage: null,
          budgetMin: null,
          budgetMax: null,
        }),
      },
    };
    actionService = {
      executeAction: jest.fn().mockResolvedValue({ success: true }),
    };
    metricsStore = {
      recordSkipped: jest.fn(),
      recordSuccess: jest.fn(),
      recordPartial: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationRunnerService,
        AutomationConditionService,
        { provide: PrismaService, useValue: prisma },
        { provide: AutomationActionService, useValue: actionService },
        {
          provide: LoggingService,
          useValue: { info: jest.fn(), error: jest.fn() },
        },
        { provide: AutomationMetricsStore, useValue: metricsStore },
      ],
    }).compile();

    service = module.get(AutomationRunnerService);
  });

  it('skips execution when conditions do not match', async () => {
    await service.run({
      workflowId: 'wf-1',
      tenantId: 'tenant-a',
      entityType: 'lead',
      entityId: 'lead-1',
      triggerType: AutomationTriggerType.LEAD_CREATED,
    });

    expect(metricsStore.recordSkipped).toHaveBeenCalled();
    expect(actionService.executeAction).not.toHaveBeenCalled();
    expect(prisma.automationExecution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AutomationExecutionStatus.SKIPPED,
        }),
      }),
    );
  });

  it('test mode simulates actions without persisting execution', async () => {
    const result = await service.testWorkflow(
      'tenant-a',
      'wf-1',
      'lead',
      'lead-1',
      { fullName: 'Ahmed' },
    );

    expect(result.conditionsMet).toBe(true);
    expect(result.actions).toHaveLength(1);
    expect(prisma.automationExecution.create).not.toHaveBeenCalled();
  });
});
