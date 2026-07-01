"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProjectStatusFilter } from "@/features/projects/types";

interface UseProjectsUrlStateOptions {
  debouncedSearch: string;
  setSearch: (value: string) => void;
  developerId: string | null;
  setDeveloperId: (developerId: string | null) => void;
  statusFilter: ProjectStatusFilter;
  setStatusFilter: (filter: ProjectStatusFilter) => void;
  highlightedProjectId: string | null;
  setHighlightedProjectId: (projectId: string | null) => void;
}

function parseStatusFilter(value: string | null): ProjectStatusFilter {
  if (value === "active" || value === "inactive") {
    return value;
  }
  return "all";
}

export function useProjectsUrlState({
  debouncedSearch,
  setSearch,
  developerId,
  setDeveloperId,
  statusFilter,
  setStatusFilter,
  highlightedProjectId,
  setHighlightedProjectId,
}: UseProjectsUrlStateOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = searchParams.toString();
    if (!signature || appliedRef.current === signature) {
      return;
    }

    const urlSearch = searchParams.get("search");
    if (urlSearch !== null) {
      setSearch(urlSearch);
    }

    const urlDeveloperId = searchParams.get("developerId");
    if (urlDeveloperId) {
      setDeveloperId(urlDeveloperId);
    }

    const urlStatus = searchParams.get("status");
    if (urlStatus) {
      setStatusFilter(parseStatusFilter(urlStatus));
    }

    const projectId = searchParams.get("projectId");
    if (projectId) {
      setHighlightedProjectId(projectId);
    }

    appliedRef.current = signature;
  }, [
    searchParams,
    setDeveloperId,
    setHighlightedProjectId,
    setSearch,
    setStatusFilter,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextSearch = debouncedSearch.trim();

    if (nextSearch) {
      params.set("search", nextSearch);
    } else {
      params.delete("search");
    }

    if (developerId) {
      params.set("developerId", developerId);
    } else {
      params.delete("developerId");
    }

    if (statusFilter === "all") {
      params.delete("status");
    } else {
      params.set("status", statusFilter);
    }

    if (highlightedProjectId) {
      params.set("projectId", highlightedProjectId);
    } else {
      params.delete("projectId");
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [
    debouncedSearch,
    developerId,
    highlightedProjectId,
    pathname,
    router,
    searchParams,
    statusFilter,
  ]);
}
