import type { ListQueryParams, PaginatedResponse } from "@/types/pagination";

export type AuditActorType = "USER" | "SYSTEM";

export interface AuditActor {
  id: string;
  fullName: string;
  email: string;
}

export interface AuditLog {
  id: string;
  actorType: AuditActorType;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditActor | null;
}

export type AuditListParams = ListQueryParams & {
  actorUserId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
};

export type AuditListResponse = PaginatedResponse<AuditLog>;

export type AuditEntityTypeFilter =
  | "all"
  | "User"
  | "Role"
  | "Lead"
  | "Project"
  | "FileAsset"
  | "ImportJob"
  | "ExportJob"
  | "LeadBulkAction";

export type AuditActionFilter =
  | "all"
  | "created"
  | "updated"
  | "deleted"
  | "assigned"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_ROLE_CHANGED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"
  | "USER_PASSWORD_RESET"
  | "USER_SESSIONS_REVOKED"
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_PERMISSIONS_UPDATED"
  | "ROLE_ARCHIVED"
  | "FILE_DELETED"
  | "IMPORT_STARTED"
  | "IMPORT_COMPLETED"
  | "EXPORT_STARTED"
  | "EXPORT_COMPLETED"
  | "BULK_LEAD_ASSIGNED"
  | "BULK_LEAD_STAGE_CHANGED";

export type AuditActionTone =
  | "create"
  | "update"
  | "delete"
  | "assign"
  | "security"
  | "neutral";
