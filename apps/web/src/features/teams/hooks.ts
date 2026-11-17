"use client";

import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/use-permissions";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { getTeams } from "./api";

export function useTeams() {
  const status = useAuthStore((state) => state.status);
  const { can } = usePermissions();

  return useQuery({
    queryKey: queryKeys.teams.list(),
    queryFn: async () => (await getTeams()).items,
    enabled: status === "authenticated" && can("team.read"),
    staleTime: 60 * 1000,
  });
}
