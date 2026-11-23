import { Injectable } from '@nestjs/common';
import { Prisma, TaskStatus, TaskType } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';

type Client = Prisma.TransactionClient | PrismaService;

/**
 * Keeps a lead's tasks consistent with the lead: follows reassignment,
 * cancels on close, and maintains `Lead.nextTaskDueAt` (the "next step"
 * pointer that every list and rule reads). Always called inside the caller's
 * transaction.
 */
@Injectable()
export class TaskLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recompute `nextTaskDueAt` from the lead's earliest open task. Manager
   * reviews (R9 "stuck" etc.) are not a next step with the client, so they
   * do not count.
   */
  async refreshNextTaskDueAt(
    leadId: string,
    tx: Client = this.prisma,
  ): Promise<Date | null> {
    const next = await tx.task.findFirst({
      where: {
        leadId,
        status: TaskStatus.OPEN,
        type: { not: TaskType.REVIEW },
      },
      orderBy: { dueAt: 'asc' },
      select: { dueAt: true },
    });
    const nextTaskDueAt = next?.dueAt ?? null;
    await tx.lead.update({
      where: { id: leadId },
      data: { nextTaskDueAt },
    });
    return nextTaskDueAt;
  }

  /**
   * Move the previous owner's open tasks on this lead to the new owner. When
   * the lead becomes unassigned, the tasks are cancelled (nobody owns them).
   */
  async followReassignment(
    leadId: string,
    fromUserId: string | null,
    toUserId: string | null,
    tx: Client = this.prisma,
  ): Promise<number> {
    if (!fromUserId) return 0;
    const where = { leadId, assigneeId: fromUserId, status: TaskStatus.OPEN };
    const result = toUserId
      ? await tx.task.updateMany({ where, data: { assigneeId: toUserId } })
      : await tx.task.updateMany({
          where,
          data: { status: TaskStatus.CANCELLED, completedAt: new Date() },
        });
    await this.refreshNextTaskDueAt(leadId, tx);
    return result.count;
  }

  /**
   * Close a lead's open tasks created by the given rules (e.g. the deal's
   * paperwork once it is contracted). Returns how many were closed.
   */
  async closeRuleTasks(
    leadId: string,
    ruleKeys: readonly string[],
    status: typeof TaskStatus.DONE | typeof TaskStatus.CANCELLED,
    tx: Client = this.prisma,
    now = new Date(),
  ): Promise<number> {
    const result = await tx.task.updateMany({
      where: {
        leadId,
        ruleKey: { in: [...ruleKeys] },
        status: TaskStatus.OPEN,
      },
      data: { status, completedAt: now },
    });
    if (result.count > 0) await this.refreshNextTaskDueAt(leadId, tx);
    return result.count;
  }

  /** A closed (won/lost) lead has no next step. */
  async cancelOpenTasks(
    leadId: string,
    tx: Client = this.prisma,
  ): Promise<number> {
    const result = await tx.task.updateMany({
      where: { leadId, status: TaskStatus.OPEN },
      data: { status: TaskStatus.CANCELLED, completedAt: new Date() },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: { nextTaskDueAt: null },
    });
    return result.count;
  }
}
