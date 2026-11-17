import { apiClient } from "@/lib/api/client";

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  sort: { sortBy?: string; sortOrder?: "asc" | "desc" };
  isShared: boolean;
  isOwn: boolean;
  user: { id: string; name: string };
}

export function getSavedViews() {
  return apiClient.get<{ items: SavedView[] }>("/saved-views");
}

export function createSavedView(input: {
  name: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  isShared: boolean;
}) {
  return apiClient.post<SavedView>("/saved-views", input);
}

export function deleteSavedView(id: string) {
  return apiClient.delete<{ id: string }>(`/saved-views/${id}`);
}
