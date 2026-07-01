"use client";

import { useMemo } from "react";
import { useProjects } from "@/features/projects/hooks";
import type { Project } from "@/features/projects/types";
import { normalizeProjectNameForComparison } from "@/features/projects/utils/project-name";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function useProjectNameDuplicate(
  name: string,
  excludeProjectId?: string,
): Project | null {
  const trimmed = name.trim();
  const debouncedName = useDebouncedValue(trimmed, 300);
  const enabled = debouncedName.length >= 2;

  const { data } = useProjects(
    enabled
      ? {
          search: debouncedName,
          limit: 20,
          sortBy: "name",
          sortOrder: "asc",
        }
      : undefined,
    { enabled },
  );

  return useMemo(() => {
    if (!enabled) {
      return null;
    }

    const normalized = normalizeProjectNameForComparison(debouncedName);
    return (
      data?.items.find(
        (project) =>
          project.id !== excludeProjectId &&
          normalizeProjectNameForComparison(project.name) === normalized,
      ) ?? null
    );
  }, [data?.items, debouncedName, enabled, excludeProjectId]);
}
