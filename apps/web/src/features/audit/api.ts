import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  AuditListParams,
  AuditListResponse,
  AuditLog,
} from "./types";

export function getAuditLogs(params?: AuditListParams) {
  return apiClient.get<AuditListResponse>("/audit", {
    query: serializeQueryParams({
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
      ...params,
    }),
  });
}

export function getAuditLogById(id: string) {
  return apiClient.get<AuditLog>(`/audit/${id}`);
}
