import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { TaskNotificationService } from './task-notification.service';

describe('TaskNotificationService', () => {
  let service: TaskNotificationService;
  let trigger: { trigger: jest.Mock };

  beforeEach(async () => {
    trigger = { trigger: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskNotificationService,
        { provide: NotificationTriggerService, useValue: trigger },
      ],
    }).compile();

    service = module.get(TaskNotificationService);
  });

  it('triggers task assigned notification', async () => {
    await service.notifyAssigned({
      tenantId: 'tenant-1',
      recipientUserId: 'user-2',
      taskId: 'task-1',
      taskTitle: 'Call customer',
      actorUserId: 'user-1',
    });

    expect(trigger.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.TASK_ASSIGNED,
        recipientUserId: 'user-2',
      }),
    );
  });

  it('triggers overdue notification', async () => {
    await service.notifyOverdue({
      tenantId: 'tenant-1',
      recipientUserId: 'user-2',
      taskId: 'task-1',
      taskTitle: 'Follow up',
    });

    expect(trigger.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.TASK_OVERDUE,
      }),
    );
  });
});
