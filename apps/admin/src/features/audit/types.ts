import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type AdminActorType = "ADMIN" | "SYSTEM";

export type AdminSecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "TOKEN_REFRESH"
  | "TOKEN_REUSE"
  | "SESSION_REVOKED"
  | "PASSWORD_CHANGED"
  | "SUSPICIOUS_LOGIN";

export type SecuritySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AdminAuditActorSummary {
  id: string;
  fullName: string;
  email: string;
}

export interface AdminAuditLog {
  id: string;
  actorType: AdminActorType;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  fingerprint: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AdminAuditActorSummary | null;
}

export interface SecurityEventAdminSummary {
  id: string;
  fullName: string;
  email: string;
}

export interface AdminSecurityEvent {
  id: string;
  eventType: AdminSecurityEventType;
  severity: SecuritySeverity;
  ipAddress: string | null;
  userAgent: string | null;
  fingerprint: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin: SecurityEventAdminSummary | null;
}

export type AuditListParams = ListQueryParams & {
  actorAdminId?: string;
  action?: string;
  entityType?: string;
  tenantId?: string;
  from?: string;
  to?: string;
};

export type SecurityEventsListParams = ListQueryParams & {
  adminId?: string;
  eventType?: AdminSecurityEventType;
  severity?: SecuritySeverity;
  from?: string;
  to?: string;
};

export type AuditListResponse = PaginatedResponse<AdminAuditLog>;
export type SecurityEventsListResponse = PaginatedResponse<AdminSecurityEvent>;

export type AuditTab = "audit" | "security";

export const SECURITY_EVENT_TYPES: AdminSecurityEventType[] = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "TOKEN_REFRESH",
  "TOKEN_REUSE",
  "SESSION_REVOKED",
  "PASSWORD_CHANGED",
  "SUSPICIOUS_LOGIN",
];

export const SECURITY_SEVERITIES: SecuritySeverity[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];
