import { apiClient } from "@/lib/api/client";
import type { ApiKey, CreateApiKeyInput, CreatedApiKey } from "@/features/api-keys/types";

export function getApiKeys() {
  return apiClient.get<{ items: ApiKey[] }>("/api-keys");
}

export function createApiKey(input: CreateApiKeyInput) {
  return apiClient.post<CreatedApiKey>("/api-keys", input);
}

export function revokeApiKey(id: string) {
  return apiClient.delete<ApiKey>(`/api-keys/${id}`);
}
