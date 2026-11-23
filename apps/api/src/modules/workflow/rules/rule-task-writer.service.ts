import { Injectable } from '@nestjs/common';
import {
  LeadActivityEventType,
  Prisma,
  TaskOrigin,
  TaskPriority,
  TaskType,
} from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeadActivityService } from '../../leads/services/lead-activity.service';
import { TaskLifecycleService } from '../common/task-lifecycle.service';
import { isUniqueViolation } from './rule-utils';

export interface RuleTaskInput {
  tenantId: string;
  leadId: string;
  assigneeId: string;
  type: TaskType;
  title: string;
  dueAt: Date;
  priority: TaskPriority;
  ruleKey: string;
  escalateAt?: Date | null;
}

/**
 * Writes one playbook task on a lead the way every rule does: the task, its
 * TASK_CREATED timeline entry and the lead's next-step pointer, together.
 */
@Injectable()
export class RuleTaskWriter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: TaskLifecycleService,
    private readonly leadActivity: LeadActivityService,
  ) {}

  /**
   * In its own transaction. Returns false when the rule already has an open
   * task on the lead (partial unique index `Task_open_lead_rule_key`).
   */
  async create(input: RuleTaskInput): Promise<boolean> {
    try {
      await this.prisma.$transaction((tx) => this.createInTx(tx, input));
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  /**
   * Inside the caller's transaction. The caller must make sure the rule has
   * no open task on the lead: a unique violation would abort its transaction.
   */
  async createInTx(
    tx: Prisma.TransactionClient,
    input: RuleTaskInput,
  ): Promise<{ id: string }> {
    const task = await tx.task.create({
      data: {
        tenantId: input.tenantId,
        leadId: input.leadId,
        assigneeId: input.assigneeId,
        type: input.type,
        title: input.title,
        dueAt: input.dueAt,
        escalateAt: input.escalateAt ?? null,
        priority: input.priority,
        origin: TaskOrigin.SYSTEM,
        ruleKey: input.ruleKey,
      },
      select: { id: true },
    });
    await this.leadActivity.createActivity(
      {
        tenantId: input.tenantId,
        leadId: input.leadId,
        actorUserId: null,
        eventType: LeadActivityEventType.TASK_CREATED,
        metadata: {
          taskId: task.id,
          taskType: input.type,
          title: input.title,
          ruleKey: input.ruleKey,
          dueAt: input.dueAt.toISOString(),
          assigneeId: input.assigneeId,
        },
      },
      tx,
    );
    await this.lifecycle.refreshNextTaskDueAt(input.leadId, tx);
    return task;
  }
}
