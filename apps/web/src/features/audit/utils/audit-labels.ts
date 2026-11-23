import type {
  AuditActionFilter,
  AuditActionTone,
  AuditEntityTypeFilter,
  AuditLog,
} from "@/features/audit/types";

const ACTION_LABELS: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  assigned: "Assigned",
  USER_CREATED: "User created",
  USER_UPDATED: "User updated",
  USER_ROLE_CHANGED: "Role changed",
  USER_DEACTIVATED: "Deactivated",
  USER_REACTIVATED: "Reactivated",
  USER_PASSWORD_RESET: "Password reset",
  USER_SESSIONS_REVOKED: "Sessions revoked",
  ROLE_CREATED: "Role created",
  ROLE_UPDATED: "Role updated",
  ROLE_PERMISSIONS_UPDATED: "Permissions updated",
  ROLE_ARCHIVED: "Role archived",
  FILE_DELETED: "File deleted",
  IMPORT_STARTED: "Import started",
  IMPORT_COMPLETED: "Import completed",
  EXPORT_STARTED: "Export started",
  EXPORT_COMPLETED: "Export completed",
  BULK_LEAD_ASSIGNED: "Bulk assigned",
  BULK_LEAD_STAGE_CHANGED: "Bulk stage change",
  LEAD_MERGED: "Leads merged",
  DEAL_RESERVED: "Deal reserved",
  DEAL_CONTRACTED: "Deal contracted",
  DEAL_UPDATED: "Deal updated",
  DEAL_CANCELLED: "Deal cancelled",
  TARGETS_UPDATED: "Targets updated",
  SOURCE_SPEND_UPDATED: "Marketing spend updated",
  AGENT_NUDGED: "Agent nudged",
  CUSTOM_FIELD_CREATED: "Custom field created",
  CUSTOM_FIELD_UPDATED: "Custom field updated",
  CUSTOM_FIELD_ARCHIVED: "Custom field archived",
  CUSTOM_FIELD_RESTORED: "Custom field restored",
  CUSTOM_FIELDS_REORDERED: "Custom fields reordered",
  PROJECT_UPDATE_POSTED: "Project update posted",
  PROJECT_UPDATE_EDITED: "Project update edited",
  PROJECT_UPDATE_DELETED: "Project update deleted",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "User",
  Role: "Role",
  Lead: "Lead",
  Project: "Project",
  FileAsset: "File",
  ImportJob: "Import",
  ExportJob: "Export",
  LeadBulkAction: "Lead bulk",
  Deal: "Deal",
  Target: "Target",
  SourceSpend: "Marketing spend",
  CustomFieldDefinition: "Custom field",
  ProjectUpdate: "Project update",
};

const METADATA_LABELS: Record<string, string> = {
  name: "Name",
  filename: "Filename",
  fullName: "Full name",
  email: "Email",
  roleId: "Role ID",
  roleName: "Role",
  previousRoleId: "Previous role",
  previousRoleName: "Previous role",
  newRoleId: "New role",
  newRoleName: "New role",
  category: "Category",
  leadCount: "Leads",
  successCount: "Succeeded",
  failureCount: "Failed",
  actionType: "Action type",
  targetUserId: "Target user",
  targetStageId: "Target stage",
  detail: "Details",
  seed: "Seed data",
};

export function formatAuditAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
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

export function getAuditActionTone(action: string): AuditActionTone {
  const normalized = action.toUpperCase();

  if (
    normalized.includes("DELETE") ||
    normalized.includes("ARCHIVED") ||
    normalized.includes("DEACTIVATED") ||
    normalized === "DELETED"
  ) {
    return "delete";
  }

  if (
    normalized.includes("CREATE") ||
    normalized.includes("REACTIVATED") ||
    normalized.includes("COMPLETED") ||
    normalized === "CREATED"
  ) {
    return "create";
  }

  if (
    normalized.includes("ASSIGN") ||
    normalized.includes("STAGE") ||
    normalized === "ASSIGNED"
  ) {
    return "assign";
  }

  if (
    normalized.includes("PASSWORD") ||
    normalized.includes("SESSION") ||
    normalized.includes("PERMISSION") ||
    normalized.includes("ROLE_CHANGED")
  ) {
    return "security";
  }

  if (normalized.includes("UPDATE") || normalized.includes("STARTED") || normalized === "UPDATED") {
    return "update";
  }

  return "neutral";
}

export function getAuditActionBadgeClass(action: string): string {
  switch (getAuditActionTone(action)) {
    case "create":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "update":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "delete":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "assign":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "security":
      return "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

export function getAuditEntityHref(
  entityType: string,
  entityId: string | null,
): string | null {
  if (!entityId) return null;

  switch (entityType) {
    case "User":
      return `/settings/users?userId=${entityId}`;
    case "Role":
      return `/settings/roles?roleId=${entityId}`;
    case "Lead":
      return `/leads?id=${entityId}`;
    case "Project":
      return `/projects?projectId=${entityId}`;
    case "FileAsset":
      return `/files?fileId=${entityId}`;
    default:
      return null;
  }
}

export function getAuditTargetLabel(log: AuditLog): string {
  if (log.entityLabel) return log.entityLabel;

  const metadata = log.metadata;
  if (metadata) {
    for (const key of ["name", "filename", "fullName", "detail"] as const) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }

  if (log.entityId) {
    return `${formatAuditEntityType(log.entityType)} ${log.entityId.slice(0, 8)}`;
  }

  return formatAuditEntityType(log.entityType);
}

export function formatAuditSummary(log: AuditLog): string {
  const actor = formatAuditActorLabel(log.actorType, log.actor);
  const action = formatAuditAction(log.action).toLowerCase();
  const entity = formatAuditEntityType(log.entityType).toLowerCase();
  const target = log.entityLabel;

  if (target) {
    return `${actor} ${action} ${entity} “${target}”`;
  }

  return `${actor} ${action} a ${entity}`;
}

export function formatAuditDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatAuditTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMetadataKey(key: string): string {
  return (
    METADATA_LABELS[key] ??
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replaceAll("_", " ")
      .replace(/^\w/, (char) => char.toUpperCase())
  );
}

export function getReadableMetadataEntries(
  metadata: Record<string, unknown> | null,
): Array<{ key: string; label: string; value: string }> {
  if (!metadata) return [];

  return Object.entries(metadata)
    .filter(([key]) => key !== "seed")
    .map(([key, value]) => ({
      key,
      label: formatMetadataKey(key),
      value: formatMetadataValue(value),
    }))
    .filter((entry) => entry.value.length > 0);
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const AUDIT_ENTITY_FILTER_OPTIONS: {
  value: AuditEntityTypeFilter;
  label: string;
}[] = [
  { value: "all", label: "All entities" },
  { value: "Lead", label: "Leads" },
  { value: "User", label: "Users" },
  { value: "Role", label: "Roles" },
  { value: "Project", label: "Projects" },
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
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "assigned", label: "Assigned" },
  { value: "USER_CREATED", label: "User created" },
  { value: "USER_UPDATED", label: "User updated" },
  { value: "USER_ROLE_CHANGED", label: "Role changed" },
  { value: "USER_DEACTIVATED", label: "Deactivated" },
  { value: "USER_REACTIVATED", label: "Reactivated" },
  { value: "USER_PASSWORD_RESET", label: "Password reset" },
  { value: "USER_SESSIONS_REVOKED", label: "Sessions revoked" },
  { value: "ROLE_CREATED", label: "Role created" },
  { value: "ROLE_UPDATED", label: "Role updated" },
  { value: "ROLE_PERMISSIONS_UPDATED", label: "Permissions updated" },
  { value: "ROLE_ARCHIVED", label: "Role archived" },
  { value: "FILE_DELETED", label: "File deleted" },
  { value: "IMPORT_STARTED", label: "Import started" },
  { value: "IMPORT_COMPLETED", label: "Import completed" },
  { value: "EXPORT_STARTED", label: "Export started" },
  { value: "EXPORT_COMPLETED", label: "Export completed" },
  { value: "BULK_LEAD_ASSIGNED", label: "Bulk assigned" },
  { value: "BULK_LEAD_STAGE_CHANGED", label: "Bulk stage change" },
];

export function toIsoDateStart(date: string): string {
  return new Date(`${date}T00:00:00.000`).toISOString();
}

export function toIsoDateEnd(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000`);
  parsed.setHours(23, 59, 59, 999);
  return parsed.toISOString();
}

export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
