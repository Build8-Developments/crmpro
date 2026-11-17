import type { LeadStatus, TaskStatus, TaskType } from '@crmpro/database';

export interface TaskResponse {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  dueAt: string;
  /** Derived: OPEN and past due. */
  isOverdue: boolean;
  completedAt: string | null;
  completionNote: string | null;
  lead: {
    id: string;
    fullName: string;
    primaryPhone: string;
    status: LeadStatus;
  } | null;
  assignedUser: { id: string; name: string };
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummary {
  overdue: number;
  dueToday: number;
  upcoming: number;
}
