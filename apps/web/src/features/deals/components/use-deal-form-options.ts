"use client";

import { useMemo } from "react";
import type { DealProjectOptions } from "@/features/deals/components/deal-fields";
import { useLeadFilterOptions } from "@/features/leads/hooks";
import { usePermissions } from "@/hooks/use-permissions";

interface LeadLike {
  assignee: { id: string; name: string } | null;
  projectInterests: Array<{ projectId: string; project: { id: string; name: string } }>;
}

/**
 * Choices for the deal form: the lead's project interests first, then every
 * other project; agents only for people who may credit someone else.
 */
export function useDealFormOptions(lead: LeadLike | undefined, ownerDefault: boolean) {
  const { projects, users } = useLeadFilterOptions();
  const { can } = usePermissions();
  const canAssign = can("lead.assign");

  const projectOptions = useMemo<DealProjectOptions>(() => {
    const interested = (lead?.projectInterests ?? []).map((interest) => interest.project);
    const interestedIds = new Set(interested.map((project) => project.id));
    const others = (projects.data ?? []).filter((project) => !interestedIds.has(project.id));
    return { interested, others };
  }, [lead?.projectInterests, projects.data]);

  const agents = useMemo(() => {
    if (!canAssign) return undefined;
    return {
      options: (users.data ?? []).map((user) => ({ id: user.id, name: user.name })),
      ownerName: lead?.assignee?.name ?? null,
      ownerDefault,
    };
  }, [canAssign, users.data, lead?.assignee?.name, ownerDefault]);

  return { projectOptions, agents, canAssign };
}
