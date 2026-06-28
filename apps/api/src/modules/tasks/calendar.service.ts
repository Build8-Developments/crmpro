import { Injectable } from '@nestjs/common';
import { Prisma, TaskPriority, TaskStatus } from '@prisma/client';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CalendarQueryDto } from './dto/get-tasks-query.dto';
import { CalendarDayGroup } from './entities/task.types';
import { formatDateKey, taskSelect, toTaskResponse } from './mappers/task.mapper';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getDayView(
    tenantId: string,
    query: CalendarQueryDto,
  ): Promise<CalendarDayGroup[]> {
    const anchor = query.date ? new Date(query.date) : new Date();
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    const end = new Date(anchor);
    end.setHours(23, 59, 59, 999);

    return this.getGroupedView(tenantId, 'day', formatDateKey(start), start, end, query);
  }

  async getWeekView(
    tenantId: string,
    query: CalendarQueryDto,
  ): Promise<CalendarDayGroup[]> {
    const anchor = query.date ? new Date(query.date) : new Date();
    const start = new Date(anchor);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return this.getGroupedView(
      tenantId,
      'week',
      formatDateKey(start),
      start,
      end,
      query,
    );
  }

  async getMonthView(
    tenantId: string,
    query: CalendarQueryDto,
  ): Promise<CalendarDayGroup[]> {
    const anchor = query.date ? new Date(query.date) : new Date();
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999);

    return this.getGroupedView(
      tenantId,
      'month',
      formatDateKey(start),
      start,
      end,
      query,
    );
  }

  private async getGroupedView(
    tenantId: string,
    view: string,
    anchorKey: string,
    start: Date,
    end: Date,
    query: CalendarQueryDto,
  ): Promise<CalendarDayGroup[]> {
    const scope = [
      query.assignedUserId ?? 'all',
      query.leadId ?? 'all',
      query.projectId ?? 'all',
      query.priority ?? 'all',
    ].join(':');

    const cacheKey = this.cacheService.buildTaskCalendarKey(
      tenantId,
      view,
      anchorKey,
      scope,
    );
    const cached = await this.cacheService.get<CalendarDayGroup[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: Prisma.TaskWhereInput = {
      tenantId,
      deletedAt: null,
      dueAt: { gte: start, lte: end },
      status: {
        notIn: [TaskStatus.CANCELLED, TaskStatus.COMPLETED],
      },
      ...(query.assignedUserId ? { assignedUserId: query.assignedUserId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.priority ? { priority: query.priority as TaskPriority } : {}),
    };

    const tasks = await this.prisma.task.findMany({
      where,
      select: taskSelect,
      orderBy: [{ dueAt: 'asc' }, { priority: 'desc' }],
    });

    const groups = new Map<string, CalendarDayGroup>();

    for (const task of tasks) {
      if (!task.dueAt) {
        continue;
      }

      const key = formatDateKey(task.dueAt);
      const group = groups.get(key) ?? { date: key, tasks: [] };
      group.tasks.push(toTaskResponse(task));
      groups.set(key, group);
    }

    const cursor = new Date(start);
    while (cursor <= end) {
      const key = formatDateKey(cursor);
      if (!groups.has(key)) {
        groups.set(key, { date: key, tasks: [] });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const result = [...groups.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    await this.cacheService.set(
      cacheKey,
      result,
      this.cacheService.getTaskCacheTtlSeconds(),
    );

    return result;
  }
}
