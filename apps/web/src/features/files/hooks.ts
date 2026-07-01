"use client";

import { useQuery } from "@tanstack/react-query";
import { getFiles } from "@/features/files/api";
import type { FilesListParams } from "@/features/files/types";
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
