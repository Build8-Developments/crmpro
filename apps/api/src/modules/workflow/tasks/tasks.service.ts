import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadActivityEventType,
  LeadStatus,
  Prisma,
  TaskOrigin,
  TaskPriority,
  TaskStatus,
} from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import { PermissionsService } from '../../../common/auth';
import {
  buildPaginatedResponse,
  getPaginationParams,
  PaginatedResponse,
} from '../../../common/pagination';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import { LeadActivityService } from '../../leads/services/lead-activity.service';
import { TaskLifecycleService } from '../common/task-lifecycle.service';
import { TenantClockService } from '../common/tenant-clock.service';
import {
  taskSelect,
  TaskResponse,
  toTaskResponse,
} from '../common/workflow.mappers';
import {
  CompleteTaskDto,
  CreateTaskDto,
  GetTasksQueryDto,
  SkipTaskDto,
  UpdateTaskDto,
} from './dto/task.dto';
import {
  type LeadScope,
  leadScopeWhere,
  scopeUserIds,
} from '../../../common/auth';

const PRIORITY_ORDER: TaskPriority[] = [
  TaskPriority.URGENT,
  TaskPriority.HIGH,
  TaskPriority.NORMAL,
  TaskPriority.LOW,
];

export interface TaskSummary {
  overdue: number;
  dueToday: number;
  upcoming: number;
  doneToday: number;
}

/** Tasks on leads outside the scope are invisible; lead-less tasks stay. */
function taskLeadScopeWhere(scope: LeadScope): Prisma.TaskWhereInput {
  if (scope.kind === 'all') return {};
  return { OR: [{ leadId: null }, { lead: leadScopeWhere(scope) }] };
}

/** Team leaders only see tasks of people in their team. */
function taskAssigneeScopeWhere(scope: LeadScope): Prisma.TaskWhereInput {
  const userIds = scopeUserIds(scope);
  return userIds ? { assigneeId: { in: userIds } } : {};
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly lifecycle: TaskLifecycleService,
    private readonly clock: TenantClockService,
    private readonly leadActivity: LeadActivityService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: GetTasksQueryDto,
    leadScope: LeadScope,
  ): Promise<PaginatedResponse<TaskResponse>> {
    const canManage = await this.canManage(user);
    const scope = query.scope ?? 'mine';
    if (
      (scope === 'team' ||
        (query.assigneeId && query.assigneeId !== user.id)) &&
      !canManage
    ) {
      throw new ForbiddenException('You can only see your own tasks');
    }

    const now = new Date();
    const { start, end } = await this.clock.todayBounds(user.tenantId, now);
    const status = query.status ?? TaskStatus.OPEN;
    const where: Prisma.TaskWhereInput = {
      tenantId: user.tenantId,
      status,
      // A lead's own task list shows everyone's steps on that lead.
      ...(scope === 'mine' && !query.assigneeId && !query.leadId
        ? { assigneeId: user.id }
        : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...this.dueWhere(query.due ?? 'all', now, start, end),
      // Tasks follow lead visibility; a team leader's "team" view is their team.
      AND: [taskLeadScopeWhere(leadScope), taskAssigneeScopeWhere(leadScope)],
    };

    const { page, limit, skip, take } = getPaginationParams(query);
    const [records, totalItems] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        // Open work: soonest first. History: most recent first.
        orderBy:
          status === TaskStatus.OPEN
            ? [{ dueAt: 'asc' }, { createdAt: 'asc' }]
            : [{ completedAt: 'desc' }],
        select: taskSelect,
        skip,
        take,
      }),
      this.prisma.task.count({ where }),
    ]);

    const tasks = records.map((r) => toTaskResponse(r, now));
    if (status === TaskStatus.OPEN) {
      // Same due time → more urgent first.
      tasks.sort(
        (a, b) =>
          a.dueAt.getTime() - b.dueAt.getTime() ||
          PRIORITY_ORDER.indexOf(a.priority) -
            PRIORITY_ORDER.indexOf(b.priority),
      );
    }
    return buildPaginatedResponse(tasks, page, limit, totalItems);
  }

  async summary(user: AuthenticatedUser): Promise<TaskSummary> {
    const now = new Date();
    const { start, end } = await this.clock.todayBounds(user.tenantId, now);
    const base = { tenantId: user.tenantId, assigneeId: user.id };
    const [overdue, dueToday, upcoming, doneToday] =
      await this.prisma.$transaction([
        this.prisma.task.count({
          where: { ...base, status: TaskStatus.OPEN, dueAt: { lt: now } },
        }),
        this.prisma.task.count({
          where: {
            ...base,
            status: TaskStatus.OPEN,
            dueAt: { gte: now, lt: end },
          },
        }),
        this.prisma.task.count({
          where: { ...base, status: TaskStatus.OPEN, dueAt: { gte: end } },
        }),
        this.prisma.task.count({
          where: {
            ...base,
            status: TaskStatus.DONE,
            completedAt: { gte: start, lt: end },
          },
        }),
      ]);
    return { overdue, dueToday, upcoming, doneToday };
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateTaskDto,
    leadScope: LeadScope,
  ): Promise<TaskResponse> {
    const lead = dto.leadId
      ? await this.getOpenLead(user.tenantId, dto.leadId, leadScope)
      : null;
    const assigneeId = dto.assigneeId ?? lead?.assignedUserId ?? user.id;
    if (assigneeId !== user.id) {
      await this.assertCanManage(user, 'assign tasks to other people');
      await this.assertActiveUser(user.tenantId, assigneeId);
    }

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          tenantId: user.tenantId,
          leadId: lead?.id ?? null,
          assigneeId,
          createdByUserId: user.id,
          type: dto.type,
          title: dto.title,
          dueAt: dto.dueAt,
          isAllDay: dto.isAllDay ?? false,
          priority: dto.priority ?? TaskPriority.NORMAL,
          origin: assigneeId === user.id ? TaskOrigin.SELF : TaskOrigin.MANAGER,
        },
        select: taskSelect,
      });
      if (lead) {
        await this.lifecycle.refreshNextTaskDueAt(lead.id, tx);
        await this.leadActivity.createActivity(
          {
            tenantId: user.tenantId,
            leadId: lead.id,
            actorUserId: user.id,
            eventType: LeadActivityEventType.TASK_CREATED,
            metadata: this.taskMetadata(created),
          },
          tx,
        );
      }
      return created;
    });
    return toTaskResponse(task);
  }

  async update(
    user: AuthenticatedUser,
    taskId: string,
    dto: UpdateTaskDto,
    leadScope: LeadScope,
  ): Promise<TaskResponse> {
    const task = await this.getOpenTaskForActor(user, taskId, leadScope);
    const isSnooze =
      dto.dueAt !== undefined && dto.dueAt.getTime() > task.dueAt.getTime();
    if (isSnooze && !dto.reason) {
      throw new BadRequestException({
        code: API_ERROR_CODES.SNOOZE_REASON_REQUIRED,
        message: 'Say why you are moving this task later.',
      });
    }
    if (dto.assigneeId && dto.assigneeId !== task.assigneeId) {
      await this.assertCanManage(user, 'reassign tasks');
      await this.assertActiveUser(user.tenantId, dto.assigneeId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const record = await tx.task.update({
        where: { id: task.id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          // A new due time gets fresh reminders.
          ...(dto.dueAt !== undefined
            ? {
                dueAt: dto.dueAt,
                reminderSentAt: null,
                overdueNotifiedAt: null,
              }
            : {}),
          ...(dto.isAllDay !== undefined ? { isAllDay: dto.isAllDay } : {}),
          ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
          ...(dto.assigneeId !== undefined
            ? { assigneeId: dto.assigneeId }
            : {}),
          ...(isSnooze ? { snoozeCount: { increment: 1 } } : {}),
        },
        select: taskSelect,
      });
      if (task.leadId) {
        await this.lifecycle.refreshNextTaskDueAt(task.leadId, tx);
        if (dto.dueAt !== undefined) {
          await this.leadActivity.createActivity(
            {
              tenantId: user.tenantId,
              leadId: task.leadId,
              actorUserId: user.id,
              eventType: LeadActivityEventType.TASK_RESCHEDULED,
              metadata: {
                ...this.taskMetadata(record),
                fromDueAt: task.dueAt.toISOString(),
                reason: dto.reason ?? null,
                snooze: isSnooze,
              },
            },
            tx,
          );
        }
      }
      return record;
    });
    return toTaskResponse(updated);
  }

  async skip(
    user: AuthenticatedUser,
    taskId: string,
    dto: SkipTaskDto,
    leadScope: LeadScope,
  ): Promise<TaskResponse> {
    const task = await this.getOpenTaskForActor(user, taskId, leadScope);
    return this.close(user, task, TaskStatus.SKIPPED, {
      skipReason: dto.reason,
      eventType: LeadActivityEventType.TASK_SKIPPED,
      extra: { reason: dto.reason },
    });
  }

  async complete(
    user: AuthenticatedUser,
    taskId: string,
    dto: CompleteTaskDto,
    leadScope: LeadScope,
  ): Promise<TaskResponse> {
    const task = await this.getOpenTaskForActor(user, taskId, leadScope);
    return this.close(user, task, TaskStatus.DONE, {
      eventType: LeadActivityEventType.TASK_COMPLETED,
      extra: { note: dto.note ?? null },
    });
  }

  private async close(
    user: AuthenticatedUser,
    task: { id: string; leadId: string | null },
    status: TaskStatus,
    options: {
      skipReason?: string;
      eventType: LeadActivityEventType;
      extra: Record<string, unknown>;
    },
  ): Promise<TaskResponse> {
    const record = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: task.id },
        data: {
          status,
          completedAt: new Date(),
          ...(options.skipReason ? { skipReason: options.skipReason } : {}),
        },
        select: taskSelect,
      });
      if (task.leadId) {
        await this.lifecycle.refreshNextTaskDueAt(task.leadId, tx);
        await this.leadActivity.createActivity(
          {
            tenantId: user.tenantId,
            leadId: task.leadId,
            actorUserId: user.id,
            eventType: options.eventType,
            metadata: {
              ...this.taskMetadata(updated),
              ...options.extra,
            },
          },
          tx,
        );
      }
      return updated;
    });
    return toTaskResponse(record);
  }

  private dueWhere(
    due: GetTasksQueryDto['due'],
    now: Date,
    todayStart: Date,
    todayEnd: Date,
  ): Prisma.TaskWhereInput {
    switch (due) {
      case 'overdue':
        return { dueAt: { lt: now } };
      case 'today':
        return { dueAt: { gte: todayStart, lt: todayEnd } };
      case 'upcoming':
        return { dueAt: { gte: todayEnd } };
      default:
        return {};
    }
  }

  private taskMetadata(task: {
    id: string;
    type: string;
    title: string;
    dueAt: Date;
    assignee: { id: string; name: string };
  }) {
    return {
      taskId: task.id,
      taskType: task.type,
      title: task.title,
      dueAt: task.dueAt.toISOString(),
      assigneeId: task.assignee.id,
      assigneeName: task.assignee.name,
    };
  }

  private async getOpenTaskForActor(
    user: AuthenticatedUser,
    taskId: string,
    leadScope: LeadScope,
  ) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        tenantId: user.tenantId,
        AND: [taskLeadScopeWhere(leadScope), taskAssigneeScopeWhere(leadScope)],
      },
      select: {
        id: true,
        leadId: true,
        assigneeId: true,
        status: true,
        dueAt: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.status !== TaskStatus.OPEN) {
      throw new BadRequestException('This task is already closed');
    }
    if (task.assigneeId !== user.id) {
      await this.assertCanManage(user, "change other people's tasks");
    }
    return task;
  }

  private async getOpenLead(
    tenantId: string,
    leadId: string,
    leadScope: LeadScope,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: {
        id: leadId,
        tenantId,
        deletedAt: null,
        ...leadScopeWhere(leadScope),
      },
      select: {
        id: true,
        status: true,
        assignedUserId: true,
        pipelineStage: { select: { isClosed: true } },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.status === LeadStatus.ARCHIVED || lead.pipelineStage.isClosed) {
      throw new BadRequestException(
        'Closed or archived leads have no next steps',
      );
    }
    return lead;
  }

  private async assertActiveUser(
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Assignee not found');
  }

  async canManage(user: AuthenticatedUser): Promise<boolean> {
    const keys = await this.permissions.getPermissionKeysForUser(
      user.id,
      user.tenantId,
    );
    return keys.has(PERMISSIONS.LEAD_ASSIGN);
  }

  private async assertCanManage(
    user: AuthenticatedUser,
    action: string,
  ): Promise<void> {
    if (!(await this.canManage(user))) {
      throw new ForbiddenException(`Only managers can ${action}`);
    }
  }
}
