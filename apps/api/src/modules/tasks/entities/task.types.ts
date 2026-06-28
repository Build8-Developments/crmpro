import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@prisma/client';

export interface TaskResponse {
  id: string;
  tenantId: string;
  leadId: string | null;
  projectId: string | null;
  developerId: string | null;
  assignedUserId: string | null;
  createdByUserId: string;
  title: string;
  description: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: Date | null;
  completedAt: Date | null;
  reminderAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDashboardData {
  pending: number;
  completedToday: number;
  overdue: number;
  dueToday: number;
  completionRate: number;
  averageCompletionTimeHours: number;
}

export interface CalendarDayGroup {
  date: string;
  tasks: TaskResponse[];
}

export interface TaskJobPayload {
  taskId: string;
  tenantId: string;
  jobType: 'REMINDER' | 'OVERDUE_SCAN' | 'DUE_TODAY';
  requestId?: string;
}

export interface CreateTaskAutomationInput {
  tenantId: string;
  createdByUserId: string;
  leadId?: string | null;
  projectId?: string | null;
  assignedUserId?: string | null;
  title: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  dueAt?: Date | null;
  reminderAt?: Date | null;
  metadata?: Record<string, unknown>;
}

export interface TaskAnalyticsData {
  pending: number;
  completed: number;
  overdue: number;
  completionRate: number;
  averageCompletionTimeHours: number;
}
