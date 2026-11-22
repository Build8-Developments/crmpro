import { Injectable } from '@nestjs/common';
import { LeadHeat, LeadStatus, TaskStatus } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { type LeadScope, scopeUserIds } from '../../../common/auth';

export interface UserWorkload {
  userId: string;
  name: string;
  role: string | null;
  openLeads: number;
  hotLeads: number;
  overdue: number;
  noNextStep: number;
  openTasks: number;
  wonLast30Days: number;
}

const OPEN_LEAD = {
  status: LeadStatus.OPEN,
  deletedAt: null,
  pipelineStage: { isClosed: false },
};

/** Who is carrying what — for transfers and assignment decisions. */
@Injectable()
export class LeadWorkloadService {
  constructor(private readonly prisma: PrismaService) {}

  /** Workload of the people inside the actor's scope (a team, or everyone). */
  async getWorkload(
    tenantId: string,
    scope: LeadScope,
  ): Promise<UserWorkload[]> {
    const now = new Date();
    const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const userIds = scopeUserIds(scope);
    const [users, open, hot, overdue, noNext, tasks, won] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          tenantId,
          isActive: true,
          deletedAt: null,
          ...(userIds ? { id: { in: userIds } } : {}),
        },
        select: { id: true, name: true, role: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.countBy(tenantId, OPEN_LEAD),
      this.countBy(tenantId, { ...OPEN_LEAD, heat: LeadHeat.HOT }),
      this.countBy(tenantId, { ...OPEN_LEAD, nextTaskDueAt: { lt: now } }),
      this.countBy(tenantId, { ...OPEN_LEAD, nextTaskDueAt: null }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: { tenantId, status: TaskStatus.OPEN },
        _count: { _all: true },
      }),
      this.countBy(tenantId, {
        deletedAt: null,
        closedAt: { gte: since },
        pipelineStage: { closeType: 'WON' },
      }),
    ]);
    const taskCounts = new Map(
      tasks.map((row) => [row.assigneeId, row._count._all]),
    );

    return users.map((user) => ({
      userId: user.id,
      name: user.name,
      role: user.role?.name ?? null,
      openLeads: open.get(user.id) ?? 0,
      hotLeads: hot.get(user.id) ?? 0,
      overdue: overdue.get(user.id) ?? 0,
      noNextStep: noNext.get(user.id) ?? 0,
      openTasks: taskCounts.get(user.id) ?? 0,
      wonLast30Days: won.get(user.id) ?? 0,
    }));
  }

  private async countBy(
    tenantId: string,
    where: Record<string, unknown>,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.lead.groupBy({
      by: ['assignedUserId'],
      where: { tenantId, assignedUserId: { not: null }, ...where },
      _count: { _all: true },
    });
    return new Map(
      rows.map((row) => [row.assignedUserId as string, row._count._all]),
    );
  }
}

export interface TransferCandidate {
  id: string;
  heat: LeadHeat;
}

/**
 * Split leads between recipients. EVEN deals hot leads first, round-robin, so
 * every recipient gets a fair share of the good ones; BALANCE gives each lead
 * to whoever currently has the fewest open leads.
 */
export function allocateLeads(
  leads: TransferCandidate[],
  recipients: Array<{ userId: string; openLeads: number }>,
  distribution: 'EVEN' | 'BALANCE',
): Map<string, string[]> {
  const order: Record<LeadHeat, number> = { HOT: 0, WARM: 1, COLD: 2 };
  const sorted = [...leads].sort((a, b) => order[a.heat] - order[b.heat]);
  const result = new Map(recipients.map((r) => [r.userId, [] as string[]]));
  if (recipients.length === 0) return result;

  if (distribution === 'EVEN') {
    sorted.forEach((lead, index) => {
      result.get(recipients[index % recipients.length].userId)!.push(lead.id);
    });
    return result;
  }

  const load = new Map(recipients.map((r) => [r.userId, r.openLeads]));
  for (const lead of sorted) {
    let target = recipients[0].userId;
    for (const r of recipients) {
      if (load.get(r.userId)! < load.get(target)!) target = r.userId;
    }
    result.get(target)!.push(lead.id);
    load.set(target, load.get(target)! + 1);
  }
  return result;
}
