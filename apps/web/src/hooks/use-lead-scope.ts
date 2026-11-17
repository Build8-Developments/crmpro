"use client";

import { usePermissions } from "@/hooks/use-permissions";

export type LeadScopeKind = "all" | "team" | "own";

/**
 * Mirrors the API's lead data scope (lead.read-all / lead.read-team / own).
 * UX only — the API enforces the scope on every request.
 */
export function useLeadScope(): LeadScopeKind {
  const { can } = usePermissions();

  if (can("lead.read-all")) return "all";
  if (can("lead.read-team")) return "team";
  return "own";
}
