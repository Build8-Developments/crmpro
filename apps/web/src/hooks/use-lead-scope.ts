"use client";

import { usePermissions } from "@/hooks/use-permissions";

export type LeadScopeKind = "all" | "team" | "own";

/** Mirrors the API's lead visibility: all, team (+ unassigned) or own (+ unassigned). */
export function useLeadScope(): LeadScopeKind {
  const { can } = usePermissions();
  if (can("lead.read-all")) return "all";
  if (can("lead.read-team")) return "team";
  return "own";
}

export const LEAD_SCOPE_LABELS: Record<Exclude<LeadScopeKind, "all">, string> = {
  team: "Your team's leads + unassigned",
  own: "Your leads + unassigned",
};
