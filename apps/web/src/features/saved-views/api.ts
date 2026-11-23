import { apiClient } from "@/lib/api/client";
import type { SavedView, SavedViewInput } from "@/features/saved-views/types";

export const getSavedViews = () => apiClient.get<{ items: SavedView[] }>("/saved-views");

export const createSavedView = (input: SavedViewInput & { name: string }) =>
  apiClient.post<SavedView>("/saved-views", input);

export const updateSavedView = (id: string, input: SavedViewInput) =>
  apiClient.patch<SavedView>(`/saved-views/${id}`, input);

export const deleteSavedView = (id: string) =>
  apiClient.delete<{ id: string }>(`/saved-views/${id}`);
