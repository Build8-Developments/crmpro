import { apiClient } from "@/lib/api/client";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export function getApiKeys() {
  return apiClient.get<{ items: ApiKey[] }>("/api-keys");
}

export function createApiKey(name: string) {
  return apiClient.post<ApiKey & { apiKey: string }>("/api-keys", { name });
}

export function revokeApiKey(id: string) {
  return apiClient.delete<{ id: string }>(`/api-keys/${id}`);
}
