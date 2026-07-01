"use client";

import { useDevelopers } from "@/features/developers/hooks";

export function useProjectDeveloperOptions() {
  return useDevelopers({
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  });
}
