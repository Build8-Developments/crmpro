"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createSavedView,
  deleteSavedView,
  getSavedViews,
  updateSavedView,
} from "@/features/saved-views/api";
import type { SavedViewInput } from "@/features/saved-views/types";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useAuthStore } from "@/stores/auth-store";

const KEY = ["saved-views"] as const;

export function useSavedViews() {
  const status = useAuthStore((state) => state.status);
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await getSavedViews()).items,
    enabled: status === "authenticated",
    staleTime: 60_000,
  });
}

export function useCreateSavedView() {
  return useApiMutation({
    mutationFn: (input: SavedViewInput & { name: string }) => createSavedView(input),
    successMessage: "View saved",
    invalidateKeys: [KEY],
  });
}

export function useUpdateSavedView() {
  return useApiMutation({
    mutationFn: ({ id, input }: { id: string; input: SavedViewInput }) => updateSavedView(id, input),
    successMessage: "View updated",
    invalidateKeys: [KEY],
  });
}

export function useDeleteSavedView() {
  return useApiMutation({
    mutationFn: (id: string) => deleteSavedView(id),
    successMessage: "View deleted",
    invalidateKeys: [KEY],
  });
}
