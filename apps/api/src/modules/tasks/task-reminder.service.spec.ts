import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { LoggingService } from '../../common/logging/logging.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AutomationTriggerService } from '../automation/automation-trigger.service';
import { TaskMetricsStore } from './metrics/task-metrics.store';
import { TaskNotificationService } from './task-notification.service';
import { TaskQueueService } from './task-queue.service';
import { TaskReminderService } from './task-reminder.service';

describe('TaskReminderService', () => {
  let service: TaskReminderService;
  let prisma: {
    task: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };
  let notificationService: {
    notifyDue: jest.Mock;
    notifyOverdue: jest.Mock;
  };
  let automationTrigger: { onTaskOverdue: jest.Mock };
  let metricsStore: { recordReminderSent: jest.Mock; recordOverdue: jest.Mock };

  const sampleTask = {
    id: 'task-1',
    tenantId: 'tenant-1',
    leadId: null,
    projectId: null,
    developerId: null,
    assignedUserId: 'user-1',
    createdByUserId: 'user-1',
    title: 'Follow up',
    description: null,
    type: TaskType.FOLLOW_UP,
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    dueAt: new Date('2026-06-27T09:00:00.000Z'),
    completedAt: null,
    reminderAt: new Date('2026-06-27T08:00:00.000Z'),
    metadata: {},
    createdAt: new Date('2026-06-26T09:00:00.000Z'),
    updatedAt: new Date('2026-06-26T09:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      task: {
        findFirst: jest.fn().mockResolvedValue(sampleTask),
        findMany: jest.fn().mockResolvedValue([sampleTask]),
        update: jest.fn().mockResolvedValue(sampleTask),
      },
    };

    notificationService = {
      notifyDue: jest.fn().mockResolvedValue(undefined),
      notifyOverdue: jest.fn().mockResolvedValue(undefined),
    };

    automationTrigger = {
      onTaskOverdue: jest.fn().mockResolvedValue(undefined),
    };

    metricsStore = {
      recordReminderSent: jest.fn(),
      recordOverdue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskReminderService,
        { provide: PrismaService, useValue: prisma },
        { provide: TaskNotificationService, useValue: notificationService },
        { provide: TaskQueueService, useValue: { enqueue: jest.fn() } },
        { provide: AutomationTriggerService, useValue: automationTrigger },
        { provide: LoggingService, useValue: { info: jest.fn() } },
        { provide: TaskMetricsStore, useValue: metricsStore },
      ],
    }).compile();

    service = module.get(TaskReminderService);
  });

  it('sends reminder notification once', async () => {
    await service.processJob({
      taskId: 'task-1',
      tenantId: 'tenant-1',
      jobType: 'REMINDER',
    });

    expect(notificationService.notifyDue).toHaveBeenCalled();
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({ reminderSent: true }),
        }),
      }),
    );
    expect(metricsStore.recordReminderSent).toHaveBeenCalled();
  });

  it('marks overdue tasks and triggers automation', async () => {
    await service.processJob({
      taskId: 'scan',
      tenantId: 'system',
      jobType: 'OVERDUE_SCAN',
    });

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: TaskStatus.OVERDUE },
      }),
    );
    expect(notificationService.notifyOverdue).toHaveBeenCalled();
    expect(automationTrigger.onTaskOverdue).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      taskId: 'task-1',
    });
    expect(metricsStore.recordOverdue).toHaveBeenCalled();
  });
});
