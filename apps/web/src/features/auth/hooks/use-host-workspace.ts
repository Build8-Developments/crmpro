"use client";

import { useQuery } from "@tanstack/react-query";
import { lookupWorkspace } from "@/features/auth/api";
import { useClientValue } from "@/hooks/use-client-value";
import { ApiError } from "@/lib/api/client";
import { currentWorkspaceSlug } from "@/lib/workspace-host";

export type HostWorkspaceStatus = "apex" | "loading" | "found" | "missing" | "error";

/**
 * The workspace this host belongs to (from the subdomain), looked up once.
 * "apex" means the bare domain: the visitor still has to find their workspace.
 */
export function useHostWorkspace() {
  // undefined during SSR and hydration, then the real value.
  const slug = useClientValue<string | null | undefined>(currentWorkspaceSlug, undefined);

  const query = useQuery({
    queryKey: ["public-workspace", slug],
    queryFn: () => lookupWorkspace(slug as string),
    enabled: Boolean(slug),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
    staleTime: 5 * 60_000,
  });

  let status: HostWorkspaceStatus;
  if (slug === undefined) status = "loading";
  else if (slug === null) status = "apex";
  else if (query.data) status = "found";
  else if (query.error instanceof ApiError && query.error.status === 404) status = "missing";
  else if (query.isError) status = "error";
  else status = "loading";

  return { slug: slug ?? null, status, workspace: query.data ?? null, retry: query.refetch };
}
