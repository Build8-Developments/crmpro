import { NotificationType } from '@crmpro/database';
import { TaskRemindersService } from './task-reminders.service';

describe('TaskRemindersService', () => {
  const task = {
    id: 'task-1',
    tenantId: 't',
    title: 'Call back',
    dueAt: new Date('2026-11-17T10:10:00Z'),
    assigneeId: 'agent-1',
    lead: { id: 'lead-1', fullName: 'Mona' },
  };

  function build() {
    const prisma = {
      task: {
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const notifications = { trigger: jest.fn() };
    const service = new TaskRemindersService(
      prisma as never,
      { register: jest.fn() } as never,
      notifications as never,
    );
    return { service, prisma, notifications };
  }

  it('sends a due-soon reminder and an overdue notice, each claimed once', async () => {
    const { service, prisma, notifications } = build();
    prisma.task.findMany
      .mockResolvedValueOnce([task]) // due soon
      .mockResolvedValueOnce([{ ...task, id: 'task-2' }]); // overdue

    const result = await service.runScan(new Date('2026-11-17T10:00:00Z'));

    expect(result).toEqual({ due: 1, overdue: 1 });
    expect(prisma.task.updateMany).toHaveBeenCalledWith({
      where: { id: 'task-1', reminderSentAt: null },
      data: { reminderSentAt: expect.any(Date) },
    });
    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.TASK_DUE,
        recipientUserId: 'agent-1',
        dedupeKey: expect.stringContaining(task.dueAt.toISOString()),
      }),
    );
    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ type: NotificationType.TASK_OVERDUE }),
    );
  });

  it('does not notify when another worker claimed the task first', async () => {
    const { service, prisma, notifications } = build();
    prisma.task.findMany
      .mockResolvedValueOnce([task])
      .mockResolvedValueOnce([]);
    prisma.task.updateMany.mockResolvedValue({ count: 0 });

    await service.runScan(new Date('2026-11-17T10:00:00Z'));

    expect(notifications.trigger).not.toHaveBeenCalled();
  });
});
