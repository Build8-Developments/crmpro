"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getFilePreviewUrl,
  getFiles,
  getFilesStats,
  getFolders,
} from "@/features/files/api";
import type { FilesListParams, FilesStatsParams } from "@/features/files/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useFiles(
  params?: FilesListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.files.list(params),
    queryFn: () => getFiles(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useFolders() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.files.folders(),
    queryFn: getFolders,
    enabled: status === "authenticated",
  });
}

export function useFilesStats(
  params: FilesStatsParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.files.stats(params),
    queryFn: () => getFilesStats(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useFilePreview(fileId: string | null) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: ["files", "preview", fileId],
    queryFn: () => getFilePreviewUrl(fileId!),
    enabled: status === "authenticated" && Boolean(fileId),
    // Signed for an hour; refresh well before it expires.
    staleTime: 30 * 60 * 1000,
  });
}
