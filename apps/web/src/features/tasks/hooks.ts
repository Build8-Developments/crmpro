"use client";

import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { getTaskSummary, getTasks } from "./api";
import type { TasksListParams } from "./types";
import { localDayBounds } from "./utils";

function useCanReadTasks() {
  const status = useAuthStore((state) => state.status);
  const { can } = usePermissions();
  return status === "authenticated" && can("task.read");
}

export function useTasks(
  params: TasksListParams,
  options?: { enabled?: boolean },
) {
  const canRead = useCanReadTasks();

  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: () => getTasks(params),
    enabled: canRead && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useLeadOpenTasks(leadId: string | undefined) {
  return useTasks(
    { leadId, status: "OPEN", limit: 20 },
    { enabled: Boolean(leadId) },
  );
}

export function useTaskSummary() {
  const canRead = useCanReadTasks();
  const { todayEnd, weekEnd } = localDayBounds();
  const bounds = {
    todayEnd: todayEnd.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };

  return useQuery({
    queryKey: queryKeys.tasks.summary({ day: todayEnd.toDateString() }),
    queryFn: () => getTaskSummary(bounds),
    enabled: canRead,
    refetchInterval: 60 * 1000,
  });
}
