import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  AdminAuditLog,
  AdminSecurityEvent,
  AuditListParams,
  AuditListResponse,
  SecurityEventsListParams,
  SecurityEventsListResponse,
} from "./types";

export function getAuditLogs(params?: AuditListParams) {
  return apiClient.get<AuditListResponse>("/audit", {
    query: serializeQueryParams({
      limit: 50,
      ...params,
    }),
  });
}

export function getAuditLogById(id: string) {
  return apiClient.get<AdminAuditLog>(`/audit/${id}`);
}

export function getSecurityEvents(params?: SecurityEventsListParams) {
  return apiClient.get<SecurityEventsListResponse>("/security-events", {
    query: serializeQueryParams({
      limit: 50,
      ...params,
    }),
  });
}

export function getSecurityEventById(id: string) {
  return apiClient.get<AdminSecurityEvent>(`/security-events/${id}`);
}
