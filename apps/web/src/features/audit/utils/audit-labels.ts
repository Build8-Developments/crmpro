import type { AuditActionFilter, AuditEntityTypeFilter } from "@/features/audit/types";

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "User created",
  USER_UPDATED: "User updated",
  USER_ROLE_CHANGED: "User role changed",
  USER_DEACTIVATED: "User deactivated",
  USER_REACTIVATED: "User reactivated",
  USER_PASSWORD_RESET: "Password reset",
  USER_SESSIONS_REVOKED: "Sessions revoked",
  ROLE_CREATED: "Role created",
  ROLE_UPDATED: "Role updated",
  ROLE_PERMISSIONS_UPDATED: "Role permissions updated",
  ROLE_ARCHIVED: "Role archived",
  FILE_DELETED: "File deleted",
  IMPORT_STARTED: "Import started",
  IMPORT_COMPLETED: "Import completed",
  EXPORT_STARTED: "Export started",
  EXPORT_COMPLETED: "Export completed",
  BULK_LEAD_ASSIGNED: "Leads bulk assigned",
  BULK_LEAD_STAGE_CHANGED: "Leads bulk stage changed",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "User",
  Role: "Role",
  FileAsset: "File",
  ImportJob: "Import job",
  ExportJob: "Export job",
  LeadBulkAction: "Lead bulk action",
};

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}

export function formatAuditEntityType(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

export function formatAuditActorLabel(
  actorType: string,
  actor: { fullName: string } | null,
): string {
  if (actor) return actor.fullName;
  if (actorType === "SYSTEM") return "System";
  return "Unknown";
}

export const AUDIT_ENTITY_FILTER_OPTIONS: {
  value: AuditEntityTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All entities" },
  { value: "User", label: "Users" },
  { value: "Role", label: "Roles" },
  { value: "FileAsset", label: "Files" },
  { value: "ImportJob", label: "Imports" },
  { value: "ExportJob", label: "Exports" },
  { value: "LeadBulkAction", label: "Lead bulk actions" },
];

export const AUDIT_ACTION_FILTER_OPTIONS: {
  value: AuditActionFilter;
  label: string;
}[] = [
  { value: "all", label: "All actions" },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({
    value: value as AuditActionFilter,
    label,
  })),
];

export function toIsoDateStart(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toISOString();
}

export function toIsoDateEnd(date: string): string {
  return new Date(`${date}T23:59:59.999Z`).toISOString();
}

export function formatAuditMetadata(
  metadata: Record<string, unknown> | null,
): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "No additional details";
  }

  return JSON.stringify(metadata, null, 2);
}
