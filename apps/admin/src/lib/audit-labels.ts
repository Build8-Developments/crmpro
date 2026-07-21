/**
 * Human-readable labels for admin audit / security events.
 */

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Signed in",
  LOGOUT: "Signed out",
  TENANT_CREATED: "Created tenant",
  TENANT_SUSPENDED: "Suspended tenant",
  TENANT_REACTIVATED: "Reactivated tenant",
  TENANT_UPDATED: "Updated tenant",
  TENANT_OWNER_UPDATED: "Updated tenant owner",
  TENANT_OWNER_PASSWORD_RESET: "Reset tenant owner password",
  TENANT_OWNER_SESSIONS_REVOKED: "Revoked tenant owner sessions",
  PLAN_CREATED: "Created plan",
  PLAN_UPDATED: "Updated plan",
  PLAN_ARCHIVED: "Archived plan",
  PLAN_UNARCHIVED: "Restored plan",
  CONTRACT_CREATED: "Created contract",
  CONTRACT_UPDATED: "Updated contract",
  CONTRACT_ACTIVATED: "Activated contract",
  CONTRACT_TERMINATED: "Terminated contract",
  CONTRACT_ARCHIVED: "Archived contract",
  ADMIN_CREATED: "Created admin",
  ADMIN_UPDATED: "Updated admin",
  ADMIN_DEACTIVATED: "Deactivated admin",
  ADMIN_REACTIVATED: "Reactivated admin",
  ADMIN_PASSWORD_RESET: "Reset admin password",
  ADMIN_SESSIONS_REVOKED: "Revoked admin sessions",
  ADMIN_NOTE_CREATED: "Added admin note",
  ADMIN_NOTE_UPDATED: "Updated admin note",
  ADMIN_NOTE_DELETED: "Deleted admin note",
  TENANT_NOTE_CREATED: "Added tenant support note",
  TENANT_NOTE_UPDATED: "Updated tenant support note",
  TENANT_NOTE_DELETED: "Deleted tenant support note",
  OWNER_UPDATED: "Updated tenant owner",
  OWNER_PASSWORD_RESET: "Reset tenant owner password",
  OWNER_SESSIONS_REVOKED: "Revoked tenant owner sessions",
};

const ENTITY_LABELS: Record<string, string> = {
  Tenant: "Tenant",
  PlatformAdmin: "Admin",
  SubscriptionPlan: "Plan",
  TenantContract: "Contract",
  AdminNote: "Note",
  TenantNote: "Support note",
  AdminSession: "Session",
};

export function formatAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? humanizeToken(action);
}

export function formatAuditEntityType(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? humanizeToken(entityType);
}

export function formatAuditSummary(
  action: string,
  entityType: string,
  entityId: string | null,
): string {
  const verb = formatAuditAction(action);
  const entity = formatAuditEntityType(entityType);
  if (!entityId) {
    return `${verb} · ${entity}`;
  }
  return `${verb} · ${entity} ${shortId(entityId)}`;
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function humanizeToken(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
}
