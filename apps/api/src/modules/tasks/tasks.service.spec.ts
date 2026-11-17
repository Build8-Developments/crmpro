import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  LeadActivityEventType,
  LeadStatus,
  NotificationType,
  TaskStatus,
  TaskType,
} from '@crmpro/database';
import type { LeadScope } from '../leads/scope/lead-scope.types';
import { TasksService } from './tasks.service';

const ownScope: LeadScope = { kind: 'own', actorUserId: 'agent-1' };
const teamScope: LeadScope = {
  kind: 'team',
  actorUserId: 'manager-1',
  userIds: ['manager-1', 'agent-1'],
};

function taskRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Call back',
    type: TaskType.CALL,
    status: TaskStatus.OPEN,
    dueAt: new Date('2030-01-01T10:00:00Z'),
    completedAt: null,
    completionNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lead: {
      id: 'lead-1',
      fullName: 'Client',
      primaryPhone: '010',
      status: LeadStatus.OPEN,
    },
    assignedUser: { id: 'agent-1', name: 'Agent' },
    createdBy: { id: 'agent-1', name: 'Agent' },
    ...overrides,
  };
}

describe('TasksService', () => {
  let tx: {
    task: { create: jest.Mock; update: jest.Mock; findFirst: jest.Mock };
    lead: { update: jest.Mock };
  };
  let prisma: {
    task: { findFirst: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    lead: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let activities: { createActivity: jest.Mock };
  let notifications: { trigger: jest.Mock };
  let events: { publish: jest.Mock };
  let service: TasksService;

  beforeEach(() => {
    tx = {
      task: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'task-1', title: 'Call back' }),
        update: jest.fn(),
        findFirst: jest
          .fn()
          .mockResolvedValue({ dueAt: new Date('2030-01-01T10:00:00Z') }),
      },
      lead: { update: jest.fn() },
    };
    prisma = {
      task: {
        findFirst: jest.fn().mockResolvedValue(taskRecord()),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      lead: {
        findFirst: jest.fn().mockResolvedValue({ status: LeadStatus.OPEN }),
      },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'agent-1' }) },
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (client: typeof tx) => unknown)(tx)
          : Promise.all(arg as Promise<unknown>[]),
      ),
    };
    activities = { createActivity: jest.fn() };
    notifications = { trigger: jest.fn() };
    events = { publish: jest.fn() };
    service = new TasksService(
      prisma as never,
      activities as never,
      notifications as never,
      events as never,
    );
  });

  it('lists only the actor tasks for own scope', async () => {
    await service.listTasks('tenant-1', {}, ownScope);

    const where = (
      prisma.task.findMany.mock.calls[0] as [
        { where: { AND: unknown[]; tenantId: string } },
      ]
    )[0].where;
    expect(where.tenantId).toBe('tenant-1');
    expect(where.AND).toContainEqual({ assignedUserId: 'agent-1' });
  });

  it('creates a follow-up for the actor, logs it on the lead and refreshes nextFollowUpAt', async () => {
    await service.createTask(
      'tenant-1',
      'agent-1',
      {
        leadId: 'lead-1',
        type: TaskType.CALL,
        dueAt: new Date('2030-01-01T10:00:00Z'),
      },
      ownScope,
    );

    expect(tx.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedUserId: 'agent-1',
          title: 'Call back',
          type: TaskType.CALL,
        }) as Record<string, unknown>,
      }),
    );
    expect(activities.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: LeadActivityEventType.TASK_CREATED,
      }),
      tx,
    );
    expect(tx.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { nextFollowUpAt: new Date('2030-01-01T10:00:00Z') },
    });
    expect(notifications.trigger).not.toHaveBeenCalled();
  });

  it('refuses to schedule on leads outside the scope', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);

    await expect(
      service.createTask(
        'tenant-1',
        'agent-1',
        { leadId: 'lead-of-other', dueAt: new Date() },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.task.create).not.toHaveBeenCalled();
  });

  it('blocks own-scope actors from assigning follow-ups to colleagues', async () => {
    await expect(
      service.createTask(
        'tenant-1',
        'agent-1',
        { dueAt: new Date(), assignedUserId: 'agent-2' },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('notifies a team member when a manager assigns them a follow-up', async () => {
    prisma.task.findFirst.mockResolvedValue(taskRecord());

    await service.createTask(
      'tenant-1',
      'manager-1',
      { leadId: 'lead-1', dueAt: new Date(), assignedUserId: 'agent-1' },
      teamScope,
    );

    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        recipientUserId: 'agent-1',
        type: NotificationType.TASK_ASSIGNED,
      }),
    );
  });

  it('completes a follow-up and schedules the next one in the same transaction', async () => {
    tx.task.create.mockResolvedValue({ id: 'task-2', title: 'Site visit' });

    const result = await service.completeTask(
      'task-1',
      'tenant-1',
      'agent-1',
      {
        note: 'Interested in 3BR',
        nextFollowUp: {
          dueAt: new Date('2030-01-05T10:00:00Z'),
          type: TaskType.SITE_VISIT,
        },
      },
      ownScope,
    );

    expect(tx.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          status: TaskStatus.DONE,
          completionNote: 'Interested in 3BR',
        }) as Record<string, unknown>,
      }),
    );
    expect(tx.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedUserId: 'agent-1',
          leadId: 'lead-1',
          type: TaskType.SITE_VISIT,
        }) as Record<string, unknown>,
      }),
    );
    expect(result.nextTask).not.toBeNull();
    expect(events.publish).toHaveBeenCalled();
  });

  it('only changes open follow-ups', async () => {
    prisma.task.findFirst.mockResolvedValue(
      taskRecord({ status: TaskStatus.DONE }),
    );

    await expect(
      service.cancelTask('task-1', 'tenant-1', 'agent-1', ownScope),
    ).rejects.toThrow('Only open follow-ups can be changed');
  });
});
