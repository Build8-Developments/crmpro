import { Test, TestingModule } from '@nestjs/testing';
import { AutomationTriggerType } from '@prisma/client';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationQueueService } from './automation-queue.service';
import { AutomationTriggerService } from './automation-trigger.service';

describe('AutomationTriggerService', () => {
  let service: AutomationTriggerService;
  let queueService: { enqueue: jest.Mock };
  let prisma: { automationWorkflow: { findMany: jest.Mock } };
  let cacheService: {
    get: jest.Mock;
    set: jest.Mock;
    buildAutomationWorkflowKey: jest.Mock;
    getAutomationCacheTtlSeconds: jest.Mock;
  };

  beforeEach(async () => {
    queueService = { enqueue: jest.fn().mockResolvedValue(undefined) };
    prisma = {
      automationWorkflow: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'wf-1',
            name: 'Assign hot leads',
            tenantId: 'tenant-a',
            trigger: AutomationTriggerType.LEAD_CREATED,
            conditions: [],
            actions: [],
          },
        ]),
      },
    };
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      buildAutomationWorkflowKey: jest
        .fn()
        .mockReturnValue('automation:workflows:tenant-a:LEAD_CREATED'),
      getAutomationCacheTtlSeconds: jest.fn().mockReturnValue(300),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationTriggerService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
        { provide: AutomationQueueService, useValue: queueService },
      ],
    }).compile();

    service = module.get(AutomationTriggerService);
  });

  it('enqueues jobs for active workflows on trigger', async () => {
    await service.onLeadCreated({ tenantId: 'tenant-a', leadId: 'lead-1' });

    expect(queueService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf-1',
        tenantId: 'tenant-a',
        entityType: 'lead',
        entityId: 'lead-1',
        triggerType: AutomationTriggerType.LEAD_CREATED,
      }),
    );
  });

  it('uses cached workflows when available', async () => {
    cacheService.get.mockResolvedValue([
      {
        id: 'wf-cached',
        name: 'Cached',
        tenantId: 'tenant-a',
        trigger: AutomationTriggerType.LEAD_ASSIGNED,
        conditions: [],
        actions: [],
      },
    ]);

    await service.onLeadAssigned({ tenantId: 'tenant-a', leadId: 'lead-2' });

    expect(prisma.automationWorkflow.findMany).not.toHaveBeenCalled();
    expect(queueService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'wf-cached' }),
    );
  });

  it('does nothing when no workflows match trigger', async () => {
    prisma.automationWorkflow.findMany.mockResolvedValue([]);

    await service.onExportCompleted({
      tenantId: 'tenant-a',
      exportJobId: 'export-1',
    });

    expect(queueService.enqueue).not.toHaveBeenCalled();
  });
});
