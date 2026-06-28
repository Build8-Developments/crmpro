import { Test, TestingModule } from '@nestjs/testing';
import {
  AutomationActionType,
  AutomationConditionOperator,
  AutomationTriggerType,
} from '@prisma/client';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationRunnerService } from './automation-runner.service';
import { AutomationService } from './automation.service';
import { AutomationTemplateService } from './automation-template.service';

const workflowRecord = {
  id: 'wf-1',
  tenantId: 'tenant-a',
  name: 'Hot Facebook Leads',
  description: null,
  enabled: true,
  trigger: AutomationTriggerType.LEAD_CREATED,
  createdByUserId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  conditions: [
    {
      id: 'cond-1',
      field: 'source.name',
      operator: AutomationConditionOperator.EQUALS,
      value: 'Facebook',
    },
  ],
  actions: [
    {
      id: 'act-1',
      actionType: AutomationActionType.CREATE_NOTE,
      configuration: { content: 'Auto note' },
      executionOrder: 0,
    },
  ],
};

describe('AutomationService', () => {
  let service: AutomationService;
  let prisma: {
    automationWorkflow: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let cacheService: { invalidateAutomationWorkflows: jest.Mock };

  beforeEach(async () => {
    prisma = {
      automationWorkflow: {
        findMany: jest.fn().mockResolvedValue([workflowRecord]),
        findFirst: jest.fn().mockResolvedValue(workflowRecord),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(workflowRecord),
        update: jest.fn().mockResolvedValue({ ...workflowRecord, enabled: false }),
      },
      $transaction: jest.fn().mockResolvedValue([[workflowRecord], 1]),
    };
    cacheService = {
      invalidateAutomationWorkflows: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        AutomationTemplateService,
        {
          provide: AutomationRunnerService,
          useValue: { testWorkflow: jest.fn() },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get(AutomationService);
  });

  it('lists tenant workflows with deletedAt filter', async () => {
    await service.listAutomations('tenant-a', { page: 1, limit: 10 });

    expect(prisma.automationWorkflow.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          deletedAt: null,
        }),
      }),
    );
  });

  it('invalidates cache after create', async () => {
    await service.createAutomation('tenant-a', 'user-1', {
      name: 'New Workflow',
      trigger: AutomationTriggerType.LEAD_CREATED,
      conditions: [],
      actions: [
        {
          actionType: AutomationActionType.DELAY,
          configuration: { delayMs: 1000 },
          executionOrder: 0,
        },
      ],
    });

    expect(cacheService.invalidateAutomationWorkflows).toHaveBeenCalledWith(
      'tenant-a',
      AutomationTriggerType.LEAD_CREATED,
    );
  });

  it('soft deletes workflow and disables it', async () => {
    const result = await service.deleteAutomation('tenant-a', 'wf-1');

    expect(result).toEqual({ id: 'wf-1' });
    expect(prisma.automationWorkflow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          enabled: false,
        }),
      }),
    );
  });

  it('throws when workflow belongs to another tenant', async () => {
    prisma.automationWorkflow.findFirst.mockResolvedValue(null);

    await expect(
      service.getAutomation('tenant-b', 'wf-1'),
    ).rejects.toThrow('Automation workflow not found');
  });
});
