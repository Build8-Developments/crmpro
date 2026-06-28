import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  LeadActivityEventType,
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@prisma/client';
import { CacheService } from '../../common/cache/cache.service';
import { LoggingService } from '../../common/logging/logging.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { TaskMetricsStore } from './metrics/task-metrics.store';
import { TaskNotificationService } from './task-notification.service';
import { TaskQueueService } from './task-queue.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    task: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    lead: { findFirst: jest.Mock };
    project: { findFirst: jest.Mock };
    developer: { findFirst: jest.Mock };
    user: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let cacheService: {
    buildTaskDashboardKey: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    getTaskCacheTtlSeconds: jest.Mock;
    invalidateTaskCaches: jest.Mock;
  };
  let leadActivityService: { createActivity: jest.Mock };
  let notificationService: { notifyAssigned: jest.Mock; notifyCompleted: jest.Mock };
  let queueService: { enqueue: jest.Mock };
  let metricsStore: { recordCreated: jest.Mock; recordCompleted: jest.Mock };

  const tenantId = 'tenant-1';
  const actorUserId = 'user-1';
  const assignedUserId = 'user-2';

  const sampleTask = {
    id: 'task-1',
    tenantId,
    leadId: 'lead-1',
    projectId: null,
    developerId: null,
    assignedUserId,
    createdByUserId: actorUserId,
    title: 'Call customer',
    description: null,
    type: TaskType.CALL,
    priority: TaskPriority.HIGH,
    status: TaskStatus.PENDING,
    dueAt: new Date('2026-07-01T09:00:00.000Z'),
    completedAt: null,
    reminderAt: null,
    metadata: {},
    createdAt: new Date('2026-06-28T08:00:00.000Z'),
    updatedAt: new Date('2026-06-28T08:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([sampleTask]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(sampleTask),
        create: jest.fn().mockResolvedValue(sampleTask),
        update: jest.fn().mockResolvedValue({
          ...sampleTask,
          status: TaskStatus.COMPLETED,
          completedAt: new Date('2026-06-28T12:00:00.000Z'),
        }),
      },
      lead: { findFirst: jest.fn().mockResolvedValue({ id: 'lead-1' }) },
      project: { findFirst: jest.fn() },
      developer: { findFirst: jest.fn() },
      user: { findFirst: jest.fn().mockResolvedValue({ id: assignedUserId }) },
      $transaction: jest.fn(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }

        return Promise.all(callback);
      }),
    };

    cacheService = {
      buildTaskDashboardKey: jest.fn().mockReturnValue('tasks:dashboard:tenant-1'),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      getTaskCacheTtlSeconds: jest.fn().mockReturnValue(300),
      invalidateTaskCaches: jest.fn().mockResolvedValue(undefined),
    };

    leadActivityService = {
      createActivity: jest.fn().mockResolvedValue(undefined),
    };

    notificationService = {
      notifyAssigned: jest.fn().mockResolvedValue(undefined),
      notifyCompleted: jest.fn().mockResolvedValue(undefined),
    };

    queueService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };

    metricsStore = {
      recordCreated: jest.fn(),
      recordCompleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
        { provide: LoggingService, useValue: { info: jest.fn() } },
        { provide: LeadActivityService, useValue: leadActivityService },
        { provide: TaskNotificationService, useValue: notificationService },
        { provide: TaskQueueService, useValue: queueService },
        { provide: TaskMetricsStore, useValue: metricsStore },
      ],
    }).compile();

    service = module.get(TasksService);
  });

  it('lists tasks scoped to tenant', async () => {
    const result = await service.listTasks(tenantId, { page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, deletedAt: null }),
      }),
    );
  });

  it('creates task with lead activity and notification', async () => {
    const result = await service.createTask(tenantId, actorUserId, {
      title: 'Call customer',
      type: TaskType.CALL,
      priority: TaskPriority.HIGH,
      leadId: 'lead-1',
      assignedUserId,
    });

    expect(result.title).toBe('Call customer');
    expect(leadActivityService.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: LeadActivityEventType.TASK_CREATED,
      }),
      prisma,
    );
    expect(notificationService.notifyAssigned).toHaveBeenCalled();
    expect(metricsStore.recordCreated).toHaveBeenCalled();
    expect(cacheService.invalidateTaskCaches).toHaveBeenCalled();
  });

  it('throws when task is not found in tenant', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(service.getTask(tenantId, 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('completes task and records metrics', async () => {
    await service.completeTask(tenantId, 'task-1', actorUserId);

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: TaskStatus.COMPLETED }),
      }),
    );
    expect(notificationService.notifyCompleted).toHaveBeenCalled();
    expect(metricsStore.recordCompleted).toHaveBeenCalled();
  });

  it('assigns task to another user', async () => {
    await service.assignTask(tenantId, 'task-1', actorUserId, {
      userId: assignedUserId,
    });

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { assignedUserId },
      }),
    );
    expect(leadActivityService.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: LeadActivityEventType.TASK_ASSIGNED,
      }),
      prisma,
    );
    expect(notificationService.notifyAssigned).toHaveBeenCalled();
  });

  it('rejects invalid status transition', async () => {
    prisma.task.findFirst.mockResolvedValue({
      ...sampleTask,
      status: TaskStatus.COMPLETED,
    });

    await expect(
      service.startTask(tenantId, 'task-1', actorUserId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns dashboard metrics and caches result', async () => {
    prisma.task.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    prisma.task.findMany.mockResolvedValue([
      {
        createdAt: new Date('2026-06-28T08:00:00.000Z'),
        completedAt: new Date('2026-06-28T13:00:00.000Z'),
      },
    ]);

    const result = await service.getDashboard(tenantId, {});

    expect(result).toEqual(
      expect.objectContaining({
        pending: 5,
        completedToday: 2,
        overdue: 1,
        dueToday: 3,
      }),
    );
    expect(cacheService.set).toHaveBeenCalled();
  });
});
