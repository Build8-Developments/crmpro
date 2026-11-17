import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadActivityEventType,
  LeadStatus,
  NotificationType,
  Prisma,
  TaskStatus,
  TaskType,
} from '@crmpro/database';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { TaskChangedEvent } from '../../common/events/domain-event.types';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../common/pagination';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildOrderBy, normalizeSearch, SortOrder } from '../../common/query';
import {
  isAssigneeInScope,
  leadScopeWhere,
  type LeadScope,
} from '../leads/scope/lead-scope.types';
import { LeadActivityService } from '../leads/services/lead-activity.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../notifications/utils/notification-dedupe.util';
import { CompleteTaskDto } from './dto/complete-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksQueryDto } from './dto/get-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { taskSelect, toTaskResponse } from './task.mapper';
import { DEFAULT_TASK_TITLES, TASK_SORT_FIELDS } from './tasks.constants';
import type { TaskResponse, TaskSummary } from './tasks.types';

const TASK_SORT_CONFIG = {
  allowedFields: TASK_SORT_FIELDS,
  defaultField: 'dueAt' as const,
  defaultOrder: SortOrder.ASC,
};

/** Tasks follow the lead scope, keyed on who the task is assigned to. */
export function taskScopeWhere(scope: LeadScope): Prisma.TaskWhereInput {
  switch (scope.kind) {
    case 'all':
      return {};
    case 'team':
      return { assignedUserId: { in: scope.userIds } };
    case 'own':
      return { assignedUserId: scope.actorUserId };
  }
}

export interface InsertTaskParams {
  tenantId: string;
  actorUserId: string;
  leadId: string | null;
  assignedUserId: string;
  title?: string;
  type?: TaskType;
  dueAt: Date;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivityService: LeadActivityService,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly domainEventBus: DomainEventBus,
  ) {}

  async listTasks(
    tenantId: string,
    query: GetTasksQueryDto,
    scope: LeadScope,
  ): Promise<PaginatedResponse<TaskResponse>> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const where = this.buildWhere(tenantId, query, scope);
    const orderBy = buildOrderBy(
      query.sortBy,
      query.sortOrder,
      TASK_SORT_CONFIG,
    );

    const [tasks, totalItems] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy,
        select: taskSelect,
        skip,
        take,
      }),
      this.prisma.task.count({ where }),
    ]);

    return buildPaginatedResponse(
      tasks.map((task) => toTaskResponse(task)),
      page,
      limit,
      totalItems,
    );
  }

  /** Counts for the "Today" view, relative to the caller's local day bounds. */
  async getSummary(
    tenantId: string,
    scope: LeadScope,
    bounds: { now: Date; endOfToday: Date; endOfWeek: Date },
  ): Promise<TaskSummary> {
    const base: Prisma.TaskWhereInput = {
      tenantId,
      deletedAt: null,
      status: TaskStatus.OPEN,
      ...taskScopeWhere(scope),
    };

    const [overdue, dueToday, upcoming] = await Promise.all([
      this.prisma.task.count({ where: { ...base, dueAt: { lt: bounds.now } } }),
      this.prisma.task.count({
        where: { ...base, dueAt: { gte: bounds.now, lte: bounds.endOfToday } },
      }),
      this.prisma.task.count({
        where: {
          ...base,
          dueAt: { gt: bounds.endOfToday, lte: bounds.endOfWeek },
        },
      }),
    ]);

    return { overdue, dueToday, upcoming };
  }

  async getTask(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<TaskResponse> {
    return toTaskResponse(await this.getTaskOrThrow(id, tenantId, scope));
  }

  async createTask(
    tenantId: string,
    actorUserId: string,
    dto: CreateTaskDto,
    scope: LeadScope,
  ): Promise<TaskResponse> {
    const leadId = dto.leadId ?? null;

    if (leadId) {
      await this.assertLeadWorkable(leadId, tenantId, scope);
    }

    const assignedUserId = dto.assignedUserId ?? actorUserId;
    await this.assertAssignable(tenantId, scope, actorUserId, assignedUserId);

    const taskId = await this.prisma.$transaction((tx) =>
      this.insertTask(tx, {
        tenantId,
        actorUserId,
        leadId,
        assignedUserId,
        title: dto.title,
        type: dto.type,
        dueAt: dto.dueAt,
      }),
    );

    const task = await this.getTaskOrThrow(taskId, tenantId, {
      kind: 'all',
      actorUserId: null,
    });
    this.afterChange(tenantId, task.id, leadId);
    this.notifyAssigned(tenantId, task, actorUserId);

    return toTaskResponse(task);
  }

  /**
   * Creates a task inside an existing transaction: writes the lead activity
   * and refreshes `Lead.nextFollowUpAt`. Callers must validate scope first
   * and call `afterChange` once the transaction commits.
   */
  async insertTask(
    tx: Prisma.TransactionClient,
    params: InsertTaskParams,
  ): Promise<string> {
    const type = params.type ?? TaskType.FOLLOW_UP;
    const task = await tx.task.create({
      data: {
        tenantId: params.tenantId,
        leadId: params.leadId,
        assignedUserId: params.assignedUserId,
        createdByUserId: params.actorUserId,
        title: params.title?.trim() || DEFAULT_TASK_TITLES[type],
        type,
        status: TaskStatus.OPEN,
        dueAt: params.dueAt,
      },
      select: { id: true, title: true },
    });

    if (params.leadId) {
      await this.leadActivityService.createActivity(
        {
          tenantId: params.tenantId,
          leadId: params.leadId,
          actorUserId: params.actorUserId,
          eventType: LeadActivityEventType.TASK_CREATED,
          metadata: {
            taskId: task.id,
            title: task.title,
            type,
            dueAt: params.dueAt.toISOString(),
            assignedUserId: params.assignedUserId,
          },
        },
        tx,
      );
      await this.refreshNextFollowUp(tx, params.tenantId, params.leadId);
    }

    return task.id;
  }

  async updateTask(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: UpdateTaskDto,
    scope: LeadScope,
  ): Promise<TaskResponse> {
    const existing = await this.getTaskOrThrow(id, tenantId, scope);
    this.ensureOpen(existing.status);

    const reassigned =
      dto.assignedUserId !== undefined &&
      dto.assignedUserId !== existing.assignedUser.id;

    if (reassigned) {
      await this.assertAssignable(
        tenantId,
        scope,
        actorUserId,
        dto.assignedUserId!,
      );
    }

    const rescheduled =
      dto.dueAt !== undefined &&
      dto.dueAt.getTime() !== existing.dueAt.getTime();

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: existing.id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(reassigned ? { assignedUserId: dto.assignedUserId } : {}),
          // A new due time earns fresh reminders.
          ...(rescheduled
            ? {
                dueAt: dto.dueAt,
                reminderSentAt: null,
                overdueNotifiedAt: null,
              }
            : {}),
        },
      });

      if (existing.lead && reassigned) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: existing.lead.id,
            actorUserId,
            eventType: LeadActivityEventType.TASK_ASSIGNED,
            metadata: {
              taskId: existing.id,
              title: existing.title,
              fromUserId: existing.assignedUser.id,
              toUserId: dto.assignedUserId,
            },
          },
          tx,
        );
      }

      if (existing.lead && rescheduled) {
        await this.refreshNextFollowUp(tx, tenantId, existing.lead.id);
      }
    });

    const task = await this.getTaskOrThrow(existing.id, tenantId, {
      kind: 'all',
      actorUserId: null,
    });
    this.afterChange(tenantId, task.id, task.lead?.id ?? null);

    if (reassigned) {
      this.notifyAssigned(tenantId, task, actorUserId);
    }

    return toTaskResponse(task);
  }

  async completeTask(
    id: string,
    tenantId: string,
    actorUserId: string,
    dto: CompleteTaskDto,
    scope: LeadScope,
  ): Promise<{ task: TaskResponse; nextTask: TaskResponse | null }> {
    const existing = await this.getTaskOrThrow(id, tenantId, scope);
    this.ensureOpen(existing.status);

    if (dto.nextFollowUp && existing.lead) {
      await this.assertLeadWorkable(existing.lead.id, tenantId, scope);
    }

    const nextTaskId = await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: existing.id },
        data: {
          status: TaskStatus.DONE,
          completedAt: new Date(),
          completionNote: dto.note || null,
        },
      });

      if (existing.lead) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: existing.lead.id,
            actorUserId,
            eventType: LeadActivityEventType.TASK_COMPLETED,
            metadata: {
              taskId: existing.id,
              title: existing.title,
              ...(dto.note ? { note: dto.note } : {}),
            },
          },
          tx,
        );
      }

      const created = dto.nextFollowUp
        ? await this.insertTask(tx, {
            tenantId,
            actorUserId,
            leadId: existing.lead?.id ?? null,
            assignedUserId: existing.assignedUser.id,
            title: dto.nextFollowUp.title,
            type: dto.nextFollowUp.type,
            dueAt: dto.nextFollowUp.dueAt,
          })
        : null;

      if (existing.lead) {
        await this.refreshNextFollowUp(tx, tenantId, existing.lead.id);
      }

      return created;
    });

    const system: LeadScope = { kind: 'all', actorUserId: null };
    const task = await this.getTaskOrThrow(existing.id, tenantId, system);
    const nextTask = nextTaskId
      ? await this.getTaskOrThrow(nextTaskId, tenantId, system)
      : null;
    this.afterChange(tenantId, task.id, task.lead?.id ?? null);

    return {
      task: toTaskResponse(task),
      nextTask: nextTask ? toTaskResponse(nextTask) : null,
    };
  }

  async cancelTask(
    id: string,
    tenantId: string,
    actorUserId: string,
    scope: LeadScope,
  ): Promise<TaskResponse> {
    const existing = await this.getTaskOrThrow(id, tenantId, scope);
    this.ensureOpen(existing.status);

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: existing.id },
        data: { status: TaskStatus.CANCELLED },
      });

      if (existing.lead) {
        await this.leadActivityService.createActivity(
          {
            tenantId,
            leadId: existing.lead.id,
            actorUserId,
            eventType: LeadActivityEventType.TASK_CANCELLED,
            metadata: { taskId: existing.id, title: existing.title },
          },
          tx,
        );
        await this.refreshNextFollowUp(tx, tenantId, existing.lead.id);
      }
    });

    const task = await this.getTaskOrThrow(existing.id, tenantId, {
      kind: 'all',
      actorUserId: null,
    });
    this.afterChange(tenantId, task.id, task.lead?.id ?? null);

    return toTaskResponse(task);
  }

  async deleteTask(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<{ id: string }> {
    const existing = await this.getTaskOrThrow(id, tenantId, scope);

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });

      if (existing.lead) {
        await this.refreshNextFollowUp(tx, tenantId, existing.lead.id);
      }
    });

    this.afterChange(tenantId, existing.id, existing.lead?.id ?? null);
    return { id: existing.id };
  }

  /** Keeps `Lead.nextFollowUpAt` = earliest open follow-up (or null). */
  async refreshNextFollowUp(
    tx: Prisma.TransactionClient,
    tenantId: string,
    leadId: string,
  ): Promise<void> {
    const next = await tx.task.findFirst({
      where: { tenantId, leadId, status: TaskStatus.OPEN, deletedAt: null },
      orderBy: { dueAt: 'asc' },
      select: { dueAt: true },
    });

    await tx.lead.update({
      where: { id: leadId },
      data: { nextFollowUpAt: next?.dueAt ?? null },
    });
  }

  /** Publish after commit so lists, boards and the Today view refresh. */
  afterChange(tenantId: string, taskId: string, leadId: string | null): void {
    void this.domainEventBus.publish(
      new TaskChangedEvent(tenantId, taskId, leadId),
    );
  }

  /** Lead must exist, be visible to the actor and still be open. */
  async assertLeadWorkable(
    leadId: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<void> {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(scope),
      },
      select: { status: true },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (lead.status === LeadStatus.ARCHIVED) {
      throw new BadRequestException(
        'Archived leads cannot have follow-ups scheduled',
      );
    }
  }

  private async assertAssignable(
    tenantId: string,
    scope: LeadScope,
    actorUserId: string,
    assignedUserId: string,
  ): Promise<void> {
    if (
      assignedUserId !== actorUserId &&
      !isAssigneeInScope(scope, assignedUserId)
    ) {
      throw new ForbiddenException(
        'You can only assign follow-ups to members of your team',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: assignedUserId, tenantId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Assigned user not found');
    }
  }

  private ensureOpen(status: TaskStatus): void {
    if (status !== TaskStatus.OPEN) {
      throw new BadRequestException('Only open follow-ups can be changed');
    }
  }

  private async getTaskOrThrow(id: string, tenantId: string, scope: LeadScope) {
    const task = await this.prisma.task.findFirst({
      where: { id, tenantId, deletedAt: null, ...taskScopeWhere(scope) },
      select: taskSelect,
    });

    if (!task) {
      throw new NotFoundException('Follow-up not found');
    }

    return task;
  }

  private buildWhere(
    tenantId: string,
    query: GetTasksQueryDto,
    scope: LeadScope,
  ): Prisma.TaskWhereInput {
    const search = normalizeSearch(query.search);
    const and: Prisma.TaskWhereInput[] = [taskScopeWhere(scope)];

    if (query.overdueOnly) {
      and.push({ status: TaskStatus.OPEN, dueAt: { lt: new Date() } });
    }

    if (query.dueFrom || query.dueTo) {
      and.push({
        dueAt: {
          ...(query.dueFrom ? { gte: query.dueFrom } : {}),
          ...(query.dueTo ? { lte: query.dueTo } : {}),
        },
      });
    }

    if (search) {
      and.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { lead: { fullName: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    return {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      AND: and,
    };
  }

  private notifyAssigned(
    tenantId: string,
    task: {
      id: string;
      title: string;
      assignedUser: { id: string };
      lead: { id: string; fullName: string } | null;
    },
    actorUserId: string,
  ): void {
    if (task.assignedUser.id === actorUserId) {
      return;
    }

    void this.notificationTrigger.trigger({
      tenantId,
      recipientUserId: task.assignedUser.id,
      type: NotificationType.TASK_ASSIGNED,
      createdByUserId: actorUserId,
      metadata: {
        taskId: task.id,
        taskTitle: task.title,
        leadId: task.lead?.id ?? null,
        leadName: task.lead?.fullName ?? null,
      },
      dedupeKey: buildNotificationDedupeKey({
        entityType: 'task',
        entityId: `${task.id}:${task.assignedUser.id}`,
        type: NotificationType.TASK_ASSIGNED,
        recipientUserId: task.assignedUser.id,
      }),
    });
  }
}
