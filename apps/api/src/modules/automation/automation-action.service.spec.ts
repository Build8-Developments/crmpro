import { Test, TestingModule } from '@nestjs/testing';
import { AutomationActionType } from '@prisma/client';
import { AutomationActionService } from './automation-action.service';
import {
  AssignAgentActionHandler,
  CreateActivityActionHandler,
  CreateNoteActionHandler,
  CreateNotificationActionHandler,
  DelayActionHandler,
  MoveStageActionHandler,
  RemoveTagActionHandler,
  TagActionHandler,
  UnsupportedActionHandler,
} from './actions/automation-action.handlers';
import { CreateTaskActionHandler } from './actions/create-task.action.handler';

describe('AutomationActionService', () => {
  let service: AutomationActionService;
  let createNotificationHandler: { execute: jest.Mock };

  beforeEach(async () => {
    createNotificationHandler = {
      actionType: AutomationActionType.CREATE_NOTIFICATION,
      execute: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationActionService,
        {
          provide: CreateNotificationActionHandler,
          useValue: createNotificationHandler,
        },
        {
          provide: AssignAgentActionHandler,
          useValue: { actionType: AutomationActionType.ASSIGN_AGENT, execute: jest.fn() },
        },
        {
          provide: MoveStageActionHandler,
          useValue: { actionType: AutomationActionType.MOVE_STAGE, execute: jest.fn() },
        },
        {
          provide: CreateNoteActionHandler,
          useValue: { actionType: AutomationActionType.CREATE_NOTE, execute: jest.fn() },
        },
        {
          provide: CreateActivityActionHandler,
          useValue: { actionType: AutomationActionType.CREATE_ACTIVITY, execute: jest.fn() },
        },
        {
          provide: DelayActionHandler,
          useValue: { actionType: AutomationActionType.DELAY, execute: jest.fn() },
        },
        {
          provide: TagActionHandler,
          useValue: { actionType: AutomationActionType.ADD_TAG, execute: jest.fn() },
        },
        {
          provide: RemoveTagActionHandler,
          useValue: { actionType: AutomationActionType.REMOVE_TAG, execute: jest.fn() },
        },
        {
          provide: CreateTaskActionHandler,
          useValue: { actionType: AutomationActionType.CREATE_TASK, execute: jest.fn() },
        },
        {
          provide: UnsupportedActionHandler,
          useValue: {
            actionType: AutomationActionType.WEBHOOK,
            execute: jest.fn().mockResolvedValue({ success: false, skipped: true }),
          },
        },
      ],
    }).compile();

    service = module.get(AutomationActionService);
  });

  it('delegates to registered handler', async () => {
    await service.executeAction(AutomationActionType.CREATE_NOTIFICATION, {
      tenantId: 'tenant-a',
      workflowId: 'wf-1',
      workflowName: 'Test',
      entityType: 'lead',
      entityId: 'lead-1',
      configuration: {
        recipientUserId: 'user-1',
        title: 'Hello',
        message: 'World',
      },
      entityData: {},
      isTest: true,
    });

    expect(createNotificationHandler.execute).toHaveBeenCalled();
  });

  it('returns skipped result for unsupported phase-1 actions', async () => {
    const result = await service.executeAction(AutomationActionType.WEBHOOK, {
      tenantId: 'tenant-a',
      workflowId: 'wf-1',
      workflowName: 'Test',
      entityType: 'lead',
      entityId: 'lead-1',
      configuration: { url: 'https://example.com' },
      entityData: {},
      isTest: true,
    });

    expect(result.skipped).toBe(true);
  });
});
