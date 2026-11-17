export type TaskType =
  | "CALL"
  | "WHATSAPP"
  | "MEETING"
  | "SITE_VISIT"
  | "EMAIL"
  | "FOLLOW_UP"
  | "OTHER";

export type TaskStatus = "OPEN" | "DONE" | "CANCELLED";

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  dueAt: string;
  isOverdue: boolean;
  completedAt: string | null;
  completionNote: string | null;
  lead: {
    id: string;
    fullName: string;
    primaryPhone: string;
    status: "OPEN" | "ARCHIVED";
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

export interface TasksListParams {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  leadId?: string;
  assignedUserId?: string;
  dueFrom?: string;
  dueTo?: string;
  overdueOnly?: boolean;
  sortBy?: "dueAt" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface CreateTaskInput {
  leadId?: string;
  title?: string;
  type?: TaskType;
  dueAt: string;
  assignedUserId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  type?: TaskType;
  dueAt?: string;
  assignedUserId?: string;
}

export interface CompleteTaskInput {
  note?: string;
  nextFollowUp?: { dueAt: string; type?: TaskType; title?: string };
}
