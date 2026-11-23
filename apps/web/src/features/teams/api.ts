import { apiClient } from "@/lib/api/client";
import type { Team, TeamInput } from "@/features/teams/types";

export function getTeams() {
  return apiClient.get<{ items: Team[] }>("/teams");
}

export function createTeam(input: TeamInput & { memberIds: string[] }) {
  return apiClient.post<Team>("/teams", input);
}

export function updateTeam(id: string, input: Partial<TeamInput>) {
  return apiClient.patch<Team>(`/teams/${id}`, input);
}

export function setTeamMembers(id: string, userIds: string[]) {
  return apiClient.put<Team>(`/teams/${id}/members`, { userIds });
}

export function deleteTeam(id: string) {
  return apiClient.delete<{ id: string }>(`/teams/${id}`);
}
