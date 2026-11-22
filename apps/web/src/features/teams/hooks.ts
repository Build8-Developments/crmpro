"use client";

import { useQuery } from "@tanstack/react-query";
import { getTeams } from "@/features/teams/api";
import { usePermissions } from "@/hooks/use-permissions";

export const TEAMS_QUERY_KEY = ["teams"] as const;

export function useTeams() {
  const { can } = usePermissions();
  return useQuery({
    queryKey: TEAMS_QUERY_KEY,
    queryFn: async () => (await getTeams()).items,
    enabled: can("team.read"),
    staleTime: 60_000,
  });
}
