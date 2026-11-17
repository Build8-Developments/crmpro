import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type { PaginatedResponse } from "@/types/pagination";
import type {
  CompleteTaskInput,
  CreateTaskInput,
  Task,
  TaskSummary,
  TasksListParams,
  UpdateTaskInput,
} from "./types";

export function getTasks(params?: TasksListParams) {
  return apiClient.get<PaginatedResponse<Task>>("/tasks", {
    query: serializeQueryParams({
      sortBy: "dueAt",
      sortOrder: "asc",
      ...params,
    }),
  });
}

export function getTaskSummary(bounds: { todayEnd: string; weekEnd: string }) {
  return apiClient.get<TaskSummary>("/tasks/summary", { query: bounds });
}

export function createTask(input: CreateTaskInput) {
  return apiClient.post<Task>("/tasks", input);
}

export function updateTask(id: string, input: UpdateTaskInput) {
  return apiClient.patch<Task>(`/tasks/${id}`, input);
}

export function completeTask(id: string, input: CompleteTaskInput) {
  return apiClient.post<{ task: Task; nextTask: Task | null }>(
    `/tasks/${id}/complete`,
    input,
  );
}

export function cancelTask(id: string) {
  return apiClient.post<Task>(`/tasks/${id}/cancel`);
}

export function deleteTask(id: string) {
  return apiClient.delete<{ id: string }>(`/tasks/${id}`);
}
