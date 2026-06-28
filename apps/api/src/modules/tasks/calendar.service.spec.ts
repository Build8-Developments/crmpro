import { Test, TestingModule } from '@nestjs/testing';
import { TaskPriority, TaskStatus, TaskType } from '@prisma/client';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: { task: { findMany: jest.Mock } };
  let cacheService: {
    buildTaskCalendarKey: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    getTaskCacheTtlSeconds: jest.Mock;
  };

  const sampleTask = {
    id: 'task-1',
    tenantId: 'tenant-1',
    leadId: null,
    projectId: null,
    developerId: null,
    assignedUserId: 'user-1',
    createdByUserId: 'user-1',
    title: 'Call customer',
    description: null,
    type: TaskType.CALL,
    priority: TaskPriority.HIGH,
    status: TaskStatus.PENDING,
    dueAt: new Date('2026-07-01T10:00:00.000Z'),
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
      },
    };

    cacheService = {
      buildTaskCalendarKey: jest.fn().mockReturnValue('tasks:calendar:tenant-1:day'),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      getTaskCacheTtlSeconds: jest.fn().mockReturnValue(300),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get(CalendarService);
  });

  it('groups tasks by date for day view', async () => {
    const result = await service.getDayView('tenant-1', {
      date: '2026-07-01',
    });

    const dayGroup = result.find((group) => group.tasks.length > 0);
    expect(dayGroup?.tasks[0]).toEqual(expect.objectContaining({ id: 'task-1' }));
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-1' }),
      }),
    );
  });

  it('returns cached calendar data on cache hit', async () => {
    const cached = [{ date: '2026-07-01', tasks: [] }];
    cacheService.get.mockResolvedValue(cached);

    await expect(
      service.getDayView('tenant-1', { date: '2026-07-01' }),
    ).resolves.toEqual(cached);
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });
});
