import { NotificationType } from '@crmpro/database';
import { TaskRemindersService } from './task-reminders.service';

describe('TaskRemindersService', () => {
  const now = new Date('2030-01-01T10:00:00Z');
  const dueTask = {
    id: 'task-1',
    tenantId: 'tenant-1',
    title: 'Call back',
    dueAt: new Date('2030-01-01T10:10:00Z'),
    assignedUserId: 'agent-1',
    lead: { id: 'lead-1', fullName: 'Client' },
  };

  let prisma: { task: { findMany: jest.Mock; updateMany: jest.Mock } };
  let tenantStatus: { isTenantActive: jest.Mock };
  let notifications: { trigger: jest.Mock };
  let service: TaskRemindersService;

  beforeEach(() => {
    prisma = {
      task: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([dueTask])
          .mockResolvedValueOnce([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    tenantStatus = { isTenantActive: jest.fn().mockResolvedValue(true) };
    notifications = { trigger: jest.fn() };
    service = new TaskRemindersService(
      prisma as never,
      { register: jest.fn() } as never,
      tenantStatus as never,
      notifications as never,
    );
  });

  it('claims each task before notifying so a reminder is sent once', async () => {
    await expect(service.runScan(now)).resolves.toEqual({ due: 1, overdue: 0 });

    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { id: 'task-1', reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        recipientUserId: 'agent-1',
        type: NotificationType.TASK_DUE,
      }),
    );
  });

  it('skips tasks another worker already claimed', async () => {
    prisma.task.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.runScan(now)).resolves.toEqual({ due: 0, overdue: 0 });
    expect(notifications.trigger).not.toHaveBeenCalled();
  });

  it('does not nag suspended tenants', async () => {
    tenantStatus.isTenantActive.mockResolvedValue(false);

    await service.runScan(now);

    expect(prisma.task.updateMany).not.toHaveBeenCalled();
    expect(notifications.trigger).not.toHaveBeenCalled();
  });
});
