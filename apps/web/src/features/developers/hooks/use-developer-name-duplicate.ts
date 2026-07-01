"use client";

import { useMemo } from "react";
import { useDevelopers } from "@/features/developers/hooks";
import type { Developer } from "@/features/developers/types";
import { normalizeDeveloperNameForComparison } from "@/features/developers/utils/developer-name";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

export function useDeveloperNameDuplicate(
  name: string,
  excludeDeveloperId?: string,
): Developer | null {
  const trimmed = name.trim();
  const debouncedName = useDebouncedValue(trimmed, 300);
  const enabled = debouncedName.length >= 2;

  const { data } = useDevelopers(
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

    const normalized = normalizeDeveloperNameForComparison(debouncedName);
    return (
      data?.items.find(
        (developer) =>
          developer.id !== excludeDeveloperId &&
          normalizeDeveloperNameForComparison(developer.name) === normalized,
      ) ?? null
    );
  }, [data?.items, debouncedName, enabled, excludeDeveloperId]);
}
