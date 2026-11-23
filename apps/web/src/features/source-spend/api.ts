import { apiClient } from "@/lib/api/client";
import type { SaveSourceSpendInput, SourceSpendGrid } from "@/features/source-spend/types";

/** Six months ending at `to` (default: the current workspace month). */
export function getSourceSpend(to?: string) {
  return apiClient.get<SourceSpendGrid>("/source-spend", { query: { to } });
}

export function saveSourceSpend(input: SaveSourceSpendInput) {
  return apiClient.put<{ changed: number }>("/source-spend", input);
}
