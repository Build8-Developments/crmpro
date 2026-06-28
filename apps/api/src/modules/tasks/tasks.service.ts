import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadActivityEventType,
  Prisma,
  TaskStatus,
} from '@prisma/client';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import { buildOrderBy, normalizeSearch, SortOrder } from '../../common/query';
import { CacheService } from '../../common/cache/cache.service';
import { LoggingService } from '../../common/logging/logging.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { AssignTaskDto, CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { GetTasksQueryDto, TaskDashboardQueryDto } from './dto/get-tasks-query.dto';
import {
  CreateTaskAutomationInput,
  TaskDashboardData,
  TaskResponse,
} from './entities/task.types';
import { TaskMetricsStore } from './metrics/task-metrics.store';
import { taskSelect, toTaskResponse } from './mappers/task.mapper';
import { TaskNotificationService } from './task-notification.service';
import { TaskQueueService } from './task-queue.service';
import { TASK_SORT_FIELDS } from './tasks.constants';

const TASK_SORT_CONFIG = {
  allowedFields: TASK_SORT_FIELDS,
  defaultField: 'dueAt' as const,
  defaultOrder: SortOrder.ASC,
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly loggingService: LoggingService,
    private readonly leadActivityService: LeadActivityService,
    private readonly notificationService: TaskNotificationService,
    private readonly queueService: TaskQueueService,
    private readonly metricsStore: TaskMetricsStore,
  ) {}

  async listTasks(
    tenantId: string,
    query: GetTasksQueryDto,
  ): Promise<PaginatedResponse<TaskResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhereClause(tenantId, query);

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        select: taskSelect,
        orderBy: buildOrderBy(query.sortBy, query.sortOrder, TASK_SORT_CONFIG),
        skip,
        take,
      }),
      this.prisma.task.count({ where }),
    ]);

    return buildPaginatedResponse(
      items.map(toTaskResponse),
      page,
      limit,
      totalItems,
    );
  }

  async getTask(tenantId: string, id: string): Promise<TaskResponse> {
    const task = await this.findTaskOrThrow(tenantId, id);
    return toTaskResponse(task);
  }

  async createTask(
    tenantId: string,
    actorUserId: string,
    dto: CreateTaskDto,
  ): Promise<TaskResponse> {
    await this.validateRelations(tenantId, dto);

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          tenantId,
          createdByUserId: actorUserId,
          title: dto.title.trim(),
          description: dto.description?.trim() ?? null,
          type: dto.type,
          priority: dto.priority,
          leadId: dto.leadId ?? null,
          projectId: dto.projectId ?? null,
          developerId: dto.developerId ?? null,
          assignedUserId: dto.assignedUserId ?? null,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
          reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
        },
        select: taskSelect,
      });

      if (created.leadId) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: created.leadId,
            actorUserId,
            eventType: LeadActivityEventType.TASK_CREATED,
            metadata: { taskId: created.id, title: created.title },
          },
          tx,
        );
      }

      return created;
    });

    await this.afterTaskMutation(tenantId, task.assignedUserId);

    if (task.assignedUserId && task.assignedUserId !== actorUserId) {
      void this.notificationService.notifyAssigned({
        tenantId,
        recipientUserId: task.assignedUserId,
        taskId: task.id,
        taskTitle: task.title,
        actorUserId,
      });
    }

    await this.scheduleReminderJob(task);
    this.metricsStore.recordCreated();
    this.logTask('create', task.id, tenantId, 'created');

    return toTaskResponse(task);
  }

  async createTaskFromAutomation(
    input: CreateTaskAutomationInput,
  ): Promise<TaskResponse> {
    const task = await this.prisma.task.create({
      data: {
        tenantId: input.tenantId,
        createdByUserId: input.createdByUserId,
        title: input.title.trim(),
        description: input.description?.trim() ?? null,
        type: input.type,
        priority: input.priority,
        leadId: input.leadId ?? null,
        projectId: input.projectId ?? null,
        assignedUserId: input.assignedUserId ?? null,
        dueAt: input.dueAt ?? null,
        reminderAt: input.reminderAt ?? null,
        metadata: {
          ...(input.metadata ?? {}),
          source: 'automation',
        } as Prisma.InputJsonValue,
      },
      select: taskSelect,
    });

    if (task.leadId) {
      await this.leadActivityService.createActivity({
        tenantId: input.tenantId,
        leadId: task.leadId,
        actorUserId: input.createdByUserId,
        eventType: LeadActivityEventType.TASK_CREATED,
        metadata: { taskId: task.id, title: task.title, source: 'automation' },
      });
    }

    if (task.assignedUserId) {
      void this.notificationService.notifyAssigned({
        tenantId: input.tenantId,
        recipientUserId: task.assignedUserId,
        taskId: task.id,
        taskTitle: task.title,
        actorUserId: input.createdByUserId,
      });
    }

    await this.scheduleReminderJob(task);
    await this.afterTaskMutation(input.tenantId, task.assignedUserId);
    this.metricsStore.recordCreated();

    return toTaskResponse(task);
  }

  async updateTask(
    tenantId: string,
    id: string,
    actorUserId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponse> {
    await this.findTaskOrThrow(tenantId, id);
    await this.validateRelations(tenantId, dto);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ?? null }
          : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.leadId !== undefined ? { leadId: dto.leadId } : {}),
        ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
        ...(dto.developerId !== undefined ? { developerId: dto.developerId } : {}),
        ...(dto.assignedUserId !== undefined
          ? { assignedUserId: dto.assignedUserId }
          : {}),
        ...(dto.dueAt !== undefined
          ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }
          : {}),
        ...(dto.reminderAt !== undefined
          ? { reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.metadata !== undefined
          ? { metadata: dto.metadata as Prisma.InputJsonValue }
          : {}),
      },
      select: taskSelect,
    });

    await this.afterTaskMutation(tenantId, task.assignedUserId);
    await this.scheduleReminderJob(task);
    this.logTask('update', task.id, tenantId, 'updated');

    return toTaskResponse(task);
  }

  async deleteTask(tenantId: string, id: string): Promise<{ id: string }> {
    const task = await this.findTaskOrThrow(tenantId, id);

    await this.prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() },
    });

    await this.afterTaskMutation(tenantId, task.assignedUserId);
    this.logTask('delete', task.id, tenantId, 'deleted');

    return { id };
  }

  async startTask(
    tenantId: string,
    id: string,
    actorUserId: string,
  ): Promise<TaskResponse> {
    const task = await this.transitionStatus(
      tenantId,
      id,
      TaskStatus.IN_PROGRESS,
      [TaskStatus.PENDING, TaskStatus.OVERDUE],
    );
    this.logTask('start', task.id, tenantId, 'started', actorUserId);
    return toTaskResponse(task);
  }

  async completeTask(
    tenantId: string,
    id: string,
    actorUserId: string,
  ): Promise<TaskResponse> {
    const existing = await this.findTaskOrThrow(tenantId, id);

    const task = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: existing.id },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
        select: taskSelect,
      });

      if (updated.leadId) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: updated.leadId,
            actorUserId,
            eventType: LeadActivityEventType.TASK_COMPLETED,
            metadata: { taskId: updated.id, title: updated.title },
          },
          tx,
        );
      }

      return updated;
    });

    if (task.assignedUserId) {
      void this.notificationService.notifyCompleted({
        tenantId,
        recipientUserId: task.assignedUserId,
        taskId: task.id,
        taskTitle: task.title,
        actorUserId,
      });
    }

    const durationMs = task.completedAt
      ? task.completedAt.getTime() - task.createdAt.getTime()
      : 0;
    this.metricsStore.recordCompleted(durationMs);
    await this.afterTaskMutation(tenantId, task.assignedUserId);
    this.logTask('complete', task.id, tenantId, 'completed', actorUserId);

    return toTaskResponse(task);
  }

  async cancelTask(
    tenantId: string,
    id: string,
    actorUserId: string,
  ): Promise<TaskResponse> {
    const existing = await this.findTaskOrThrow(tenantId, id);

    const task = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: existing.id },
        data: { status: TaskStatus.CANCELLED },
        select: taskSelect,
      });

      if (updated.leadId) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: updated.leadId,
            actorUserId,
            eventType: LeadActivityEventType.TASK_CANCELLED,
            metadata: { taskId: updated.id, title: updated.title },
          },
          tx,
        );
      }

      return updated;
    });

    await this.afterTaskMutation(tenantId, task.assignedUserId);
    this.logTask('cancel', task.id, tenantId, 'cancelled', actorUserId);

    return toTaskResponse(task);
  }

  async assignTask(
    tenantId: string,
    id: string,
    actorUserId: string,
    dto: AssignTaskDto,
  ): Promise<TaskResponse> {
    await this.validateUser(dto.userId, tenantId);
    const existing = await this.findTaskOrThrow(tenantId, id);

    const task = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: existing.id },
        data: { assignedUserId: dto.userId },
        select: taskSelect,
      });

      if (updated.leadId) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: updated.leadId,
            actorUserId,
            eventType: LeadActivityEventType.TASK_ASSIGNED,
            metadata: {
              taskId: updated.id,
              title: updated.title,
              assignedUserId: dto.userId,
            },
          },
          tx,
        );
      }

      return updated;
    });

    void this.notificationService.notifyAssigned({
      tenantId,
      recipientUserId: dto.userId,
      taskId: task.id,
      taskTitle: task.title,
      actorUserId,
    });

    await this.afterTaskMutation(tenantId, dto.userId);
    this.logTask('assign', task.id, tenantId, 'assigned', actorUserId);

    return toTaskResponse(task);
  }

  async getDashboard(
    tenantId: string,
    query: TaskDashboardQueryDto,
  ): Promise<TaskDashboardData> {
    const cacheKey = this.cacheService.buildTaskDashboardKey(
      tenantId,
      query.assignedUserId,
    );
    const cached = await this.cacheService.get<TaskDashboardData>(cacheKey);
    if (cached) {
      return cached;
    }

    const baseWhere: Prisma.TaskWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
    };

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const [pending, completedToday, overdue, dueToday, completedTasks] =
      await Promise.all([
        this.prisma.task.count({
          where: {
            ...baseWhere,
            status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
          },
        }),
        this.prisma.task.count({
          where: {
            ...baseWhere,
            status: TaskStatus.COMPLETED,
            completedAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        this.prisma.task.count({
          where: { ...baseWhere, status: TaskStatus.OVERDUE },
        }),
        this.prisma.task.count({
          where: {
            ...baseWhere,
            status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
            dueAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        this.prisma.task.findMany({
          where: {
            ...baseWhere,
            status: TaskStatus.COMPLETED,
            completedAt: { not: null },
          },
          select: { createdAt: true, completedAt: true },
          take: 500,
          orderBy: { completedAt: 'desc' },
        }),
      ]);

    const totalFinished = completedTasks.length + overdue;
    const completionRate =
      totalFinished === 0
        ? 100
        : Math.round((completedTasks.length / totalFinished) * 1000) / 10;

    let totalCompletionMs = 0;
    for (const task of completedTasks) {
      if (task.completedAt) {
        totalCompletionMs += task.completedAt.getTime() - task.createdAt.getTime();
      }
    }

    const data: TaskDashboardData = {
      pending,
      completedToday,
      overdue,
      dueToday,
      completionRate,
      averageCompletionTimeHours:
        completedTasks.length === 0
          ? 0
          : Math.round((totalCompletionMs / completedTasks.length / 3_600_000) * 10) / 10,
    };

    await this.cacheService.set(
      cacheKey,
      data,
      this.cacheService.getTaskCacheTtlSeconds(),
    );

    return data;
  }

  private async transitionStatus(
    tenantId: string,
    id: string,
    target: TaskStatus,
    allowed: TaskStatus[],
  ) {
    const existing = await this.findTaskOrThrow(tenantId, id);

    if (!allowed.includes(existing.status)) {
      throw new BadRequestException(
        `Cannot transition task from ${existing.status} to ${target}`,
      );
    }

    const task = await this.prisma.task.update({
      where: { id: existing.id },
      data: { status: target },
      select: taskSelect,
    });

    await this.afterTaskMutation(tenantId, task.assignedUserId);
    return task;
  }

  private buildWhereClause(
    tenantId: string,
    query: GetTasksQueryDto,
  ): Prisma.TaskWhereInput {
    const search = normalizeSearch(query.search);
    const now = new Date();

    return {
      tenantId,
      deletedAt: null,
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.overdueOnly
        ? {
            OR: [
              { status: TaskStatus.OVERDUE },
              {
                status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
                dueAt: { lt: now },
              },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            dueAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  private async findTaskOrThrow(tenantId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: taskSelect,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  private async validateRelations(
    tenantId: string,
    dto: Partial<CreateTaskDto | UpdateTaskDto>,
  ): Promise<void> {
    if (dto.leadId) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: dto.leadId, tenantId, deletedAt: null },
      });
      if (!lead) {
        throw new BadRequestException('Lead not found');
      }
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, tenantId, deletedAt: null },
      });
      if (!project) {
        throw new BadRequestException('Project not found');
      }
    }

    if (dto.developerId) {
      const developer = await this.prisma.developer.findFirst({
        where: { id: dto.developerId, tenantId, deletedAt: null },
      });
      if (!developer) {
        throw new BadRequestException('Developer not found');
      }
    }

    if (dto.assignedUserId) {
      await this.validateUser(dto.assignedUserId, tenantId);
    }
  }

  private async validateUser(userId: string, tenantId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null, isActive: true },
    });

    if (!user) {
      throw new BadRequestException('Assigned user not found');
    }
  }

  private async afterTaskMutation(
    tenantId: string,
    userId?: string | null,
  ): Promise<void> {
    await this.cacheService.invalidateTaskCaches(tenantId, userId ?? undefined);
  }

  private async scheduleReminderJob(task: {
    id: string;
    tenantId: string;
    reminderAt: Date | null;
  }): Promise<void> {
    if (!task.reminderAt) {
      return;
    }

    const delayMs = task.reminderAt.getTime() - Date.now();
    if (delayMs <= 0) {
      return;
    }

    void this.queueService.enqueue(
      {
        taskId: task.id,
        tenantId: task.tenantId,
        jobType: 'REMINDER',
      },
      delayMs,
    );
  }

  private logTask(
    operation: string,
    taskId: string,
    tenantId: string,
    status: string,
    actorUserId?: string,
  ): void {
    this.loggingService.info({
      module: 'Tasks',
      operation,
      status,
      metadata: { taskId, tenantId, actorUserId },
    });
  }
}
