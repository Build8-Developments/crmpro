import type { Prisma } from '@crmpro/database';
import type { TaskResponse } from './tasks.types';

export const taskSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  dueAt: true,
  completedAt: true,
  completionNote: true,
  createdAt: true,
  updatedAt: true,
  lead: {
    select: {
      id: true,
      fullName: true,
      primaryPhone: true,
      status: true,
    },
  },
  assignedUser: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;

export type TaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export function toTaskResponse(task: TaskRecord): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    dueAt: task.dueAt.toISOString(),
    isOverdue: task.status === 'OPEN' && task.dueAt.getTime() < Date.now(),
    completedAt: task.completedAt?.toISOString() ?? null,
    completionNote: task.completionNote,
    lead: task.lead,
    assignedUser: task.assignedUser,
    createdBy: task.createdBy,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
