import { Prisma } from '@prisma/client';
import { TaskResponse } from '../entities/task.types';

export const taskSelect = {
  id: true,
  tenantId: true,
  leadId: true,
  projectId: true,
  developerId: true,
  assignedUserId: true,
  createdByUserId: true,
  title: true,
  description: true,
  type: true,
  priority: true,
  status: true,
  dueAt: true,
  completedAt: true,
  reminderAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TaskSelect;

type TaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export function toTaskResponse(task: TaskRecord): TaskResponse {
  return {
    id: task.id,
    tenantId: task.tenantId,
    leadId: task.leadId,
    projectId: task.projectId,
    developerId: task.developerId,
    assignedUserId: task.assignedUserId,
    createdByUserId: task.createdByUserId,
    title: task.title,
    description: task.description,
    type: task.type,
    priority: task.priority,
    status: task.status,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    reminderAt: task.reminderAt,
    metadata: task.metadata as Record<string, unknown>,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
