"use client";

import { useTranslations } from "next-intl";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { createTeam, deleteTeam, setTeamMembers, updateTeam } from "./api";
import type { CreateTeamInput, UpdateTeamInput } from "./types";

// Membership changes alter who can see which leads, so lead-derived views
// are refreshed too.
const teamInvalidateKeys = [
  queryKeys.teams.all(),
  queryKeys.users.all(),
  queryKeys.leads.all(),
  queryKeys.dashboard.all(),
];

export function useCreateTeam() {
  const t = useTranslations("teams.toast");

  return useApiMutation({
    mutationFn: (input: CreateTeamInput) => createTeam(input),
    successMessage: t("created"),
    invalidateKeys: teamInvalidateKeys,
  });
}

export function useUpdateTeam() {
  const t = useTranslations("teams.toast");

  return useApiMutation({
    mutationFn: async (input: {
      id: string;
      details: UpdateTeamInput;
      memberIds: string[];
    }) => {
      await updateTeam(input.id, input.details);
      return setTeamMembers(input.id, input.memberIds);
    },
    successMessage: t("updated"),
    invalidateKeys: teamInvalidateKeys,
  });
}

export function useDeleteTeam() {
  const t = useTranslations("teams.toast");

  return useApiMutation({
    mutationFn: (id: string) => deleteTeam(id),
    successMessage: t("deleted"),
    invalidateKeys: teamInvalidateKeys,
  });
}
