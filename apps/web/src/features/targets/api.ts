import { apiClient } from "@/lib/api/client";
import type {
  MyTargets,
  SaveTargetsInput,
  TargetSuggestions,
  TargetsGrid,
} from "@/features/targets/types";

export function getTargets(period?: string) {
  return apiClient.get<TargetsGrid>("/targets", { query: { period } });
}

export function saveTargets(input: SaveTargetsInput) {
  return apiClient.put<TargetsGrid>("/targets", input);
}

export function getTargetSuggestions(period: string) {
  return apiClient.get<TargetSuggestions>("/targets/suggest", { query: { period } });
}

export function getMyTargets(period?: string) {
  return apiClient.get<MyTargets>("/targets/me", { query: { period } });
}
