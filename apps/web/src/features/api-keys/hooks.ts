"use client";

import { useQuery } from "@tanstack/react-query";
import { createApiKey, getApiKeys, revokeApiKey } from "@/features/api-keys/api";
import type { CreateApiKeyInput } from "@/features/api-keys/types";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api/client";
import { useApiMutation } from "@/lib/query/use-api-mutation";

export const API_KEYS_QUERY_KEY = ["api-keys"] as const;

export function useApiKeys() {
  const { can } = usePermissions();
  return useQuery({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: async () => (await getApiKeys()).items,
    enabled: can("settings.manage"),
    // 403 = the plan has no API access; retrying won't change that.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 403) && failureCount < 1,
  });
}

export function useCreateApiKey() {
  return useApiMutation({
    mutationFn: (input: CreateApiKeyInput) => createApiKey(input),
    invalidateKeys: [API_KEYS_QUERY_KEY],
  });
}

export function useRevokeApiKey() {
  return useApiMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    successMessage: "API key revoked",
    invalidateKeys: [API_KEYS_QUERY_KEY],
  });
}
