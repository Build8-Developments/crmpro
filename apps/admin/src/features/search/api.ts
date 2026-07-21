import { apiClient } from "@/lib/api/client";
import type { GlobalSearchResult } from "./types";

export function globalSearch(q: string, limit = 8) {
  return apiClient.get<GlobalSearchResult>("/search", {
    query: { q, limit },
  });
}
