import { Test, TestingModule } from '@nestjs/testing';
import {
  AutomationActionType,
  TaskPriority,
  TaskType,
} from '@prisma/client';
import { TasksService } from '../../tasks/tasks.service';
import { CreateTaskActionHandler } from './create-task.action.handler';

describe('CreateTaskActionHandler', () => {
  let handler: CreateTaskActionHandler;
  let tasksService: { createTaskFromAutomation: jest.Mock };

  beforeEach(async () => {
    tasksService = {
      createTaskFromAutomation: jest.fn().mockResolvedValue({ id: 'task-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTaskActionHandler,
        { provide: TasksService, useValue: tasksService },
      ],
    }).compile();

    handler = module.get(CreateTaskActionHandler);
  });

  it('creates task from lead automation context', async () => {
    const result = await handler.execute({
      tenantId: 'tenant-1',
      workflowId: 'wf-1',
      workflowName: 'Lead Assigned',
      entityType: 'lead',
      entityId: 'lead-1',
      configuration: {
        title: 'Call Customer',
        dueAt: '2026-07-01T09:00:00.000Z',
      },
      entityData: { assignedUserId: 'user-2' },
      actorUserId: 'user-1',
      isTest: false,
    });

    expect(result.success).toBe(true);
    expect(tasksService.createTaskFromAutomation).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        leadId: 'lead-1',
        title: 'Call Customer',
        assignedUserId: 'user-2',
        type: TaskType.FOLLOW_UP,
        priority: TaskPriority.MEDIUM,
      }),
    );
  });

  it('returns dry-run message in test mode', async () => {
    const result = await handler.execute({
      tenantId: 'tenant-1',
      workflowId: 'wf-1',
      workflowName: 'Lead Won',
      entityType: 'lead',
      entityId: 'lead-1',
      configuration: { title: 'Collect Documents' },
      entityData: {},
      isTest: true,
    });

    expect(result).toEqual({
      success: true,
      message: 'Would create task: Collect Documents',
    });
    expect(tasksService.createTaskFromAutomation).not.toHaveBeenCalled();
  });

  it('registers CREATE_TASK action type', () => {
    expect(handler.actionType).toBe(AutomationActionType.CREATE_TASK);
  });
});
