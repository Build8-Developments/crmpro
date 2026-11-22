import { LeadHeat, Prisma } from '@crmpro/database';
import { maskPhone } from '@crmpro/shared/leads';

export const taskSelect = {
  id: true,
  leadId: true,
  type: true,
  title: true,
  dueAt: true,
  escalateAt: true,
  isAllDay: true,
  priority: true,
  origin: true,
  ruleKey: true,
  status: true,
  completedAt: true,
  skipReason: true,
  snoozeCount: true,
  createdAt: true,
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  lead: {
    select: {
      id: true,
      fullName: true,
      primaryPhone: true,
      heat: true,
      pipelineStage: {
        select: { id: true, name: true, color: true, icon: true },
      },
    },
  },
} satisfies Prisma.TaskSelect;

export type TaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export interface TaskResponse {
  id: string;
  leadId: string | null;
  type: TaskRecord['type'];
  title: string;
  dueAt: Date;
  /** First-contact tasks: when the manager gets alerted. */
  escalateAt: Date | null;
  isAllDay: boolean;
  isOverdue: boolean;
  priority: TaskRecord['priority'];
  origin: TaskRecord['origin'];
  ruleKey: string | null;
  status: TaskRecord['status'];
  completedAt: Date | null;
  skipReason: string | null;
  snoozeCount: number;
  createdAt: Date;
  assignee: { id: string; name: string };
  createdBy: { id: string; name: string } | null;
  lead: {
    id: string;
    fullName: string;
    primaryPhone: string;
    heat: LeadHeat;
    stage: {
      id: string;
      name: string;
      color: string | null;
      icon: string | null;
    };
  } | null;
}

export function toTaskResponse(
  task: TaskRecord,
  now = new Date(),
): TaskResponse {
  return {
    id: task.id,
    leadId: task.leadId,
    type: task.type,
    title: task.title,
    dueAt: task.dueAt,
    escalateAt: task.escalateAt,
    isAllDay: task.isAllDay,
    isOverdue: task.status === 'OPEN' && task.dueAt.getTime() < now.getTime(),
    priority: task.priority,
    origin: task.origin,
    ruleKey: task.ruleKey,
    status: task.status,
    completedAt: task.completedAt,
    skipReason: task.skipReason,
    snoozeCount: task.snoozeCount,
    createdAt: task.createdAt,
    assignee: task.assignee,
    createdBy: task.createdBy,
    lead: task.lead
      ? {
          id: task.lead.id,
          fullName: task.lead.fullName,
          primaryPhone: maskPhone(task.lead.primaryPhone),
          heat: task.lead.heat,
          stage: task.lead.pipelineStage,
        }
      : null,
  };
}

export const interactionSelect = {
  id: true,
  leadId: true,
  channel: true,
  direction: true,
  outcome: true,
  durationSeconds: true,
  note: true,
  occurredAt: true,
  createdAt: true,
  user: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  evidence: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, originalFilename: true, mimeType: true },
  },
} satisfies Prisma.InteractionSelect;

export type InteractionRecord = Prisma.InteractionGetPayload<{
  select: typeof interactionSelect;
}>;

export type InteractionResponse = InteractionRecord;
