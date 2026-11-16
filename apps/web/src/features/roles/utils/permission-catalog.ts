import {
  PERMISSION_GROUPS,
  PERMISSION_GROUP_LABELS,
  type PermissionGroupKey,
} from "@crmpro/shared";

// Groups and labels come from @crmpro/shared so the role editor can never
// drift from the permissions the API actually enforces.
export { PERMISSION_GROUPS, PERMISSION_GROUP_LABELS, type PermissionGroupKey };

export const PERMISSION_GROUP_ORDER = Object.keys(
  PERMISSION_GROUPS,
) as PermissionGroupKey[];

const ACTION_LABELS: Record<string, string> = {
  create: "Create",
  read: "View",
  update: "Edit",
  delete: "Delete",
  assign: "Assign",
  manage: "Manage",
  upload: "Upload",
};

/** Short action label for chips inside a named permission group. */
export function formatPermissionActionLabel(key: string): string {
  const action = key.split(".").pop() ?? key;
  return (
    ACTION_LABELS[action] ??
    action
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function formatPermissionLabel(key: string): string {
  const [resource, ...actionParts] = key.split(".");
  const action = actionParts.join(".");
  if (!action) return key;
  return `${humanizeSegment(resource)} · ${formatPermissionActionLabel(key)}`;
}

function humanizeSegment(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  "lead.create": "Create new leads",
  "lead.read": "View leads",
  "lead.update": "Update lead details",
  "lead.delete": "Delete leads",
  "lead.assign": "Assign leads to team members",
  "lead-note.create": "Create lead notes",
  "lead-note.read": "View lead notes",
  "lead-note.update": "Update lead notes",
  "lead-note.delete": "Delete lead notes",
  "lead-source.create": "Create lead sources",
  "lead-source.read": "View lead sources",
  "lead-source.update": "Update lead sources",
  "lead-source.delete": "Delete lead sources",
  "developer.create": "Create developers",
  "developer.read": "View developers",
  "developer.update": "Update developers",
  "developer.delete": "Delete developers",
  "project.create": "Create projects",
  "project.read": "View projects",
  "project.update": "Update projects",
  "project.delete": "Delete projects",
  "pipeline.create": "Create pipelines",
  "pipeline.read": "View pipelines",
  "pipeline.update": "Update pipelines and stages",
  "pipeline.delete": "Delete pipelines",
  "user.create": "Create users",
  "user.read": "View users",
  "user.update": "Update users",
  "user.delete": "Delete users",
  "user.manage": "Reset passwords and revoke user sessions",
  "role.create": "Create custom roles",
  "role.read": "View roles",
  "role.update": "Update roles",
  "role.delete": "Delete roles",
  "role.manage": "Manage custom roles and permissions",
  "file.upload": "Upload files",
  "file.read": "View and download files",
  "file.delete": "Delete files",
  "file.manage": "Manage all folders and reset folder passwords",
  "import-job.create": "Create import jobs",
  "import-job.read": "View import jobs",
  "export-job.create": "Create export jobs",
  "export-job.read": "View export jobs",
  "analytics.read": "View analytics dashboard",
  "notification.read": "View notifications",
  "notification.update": "Mark notifications as read",
  "notification.delete": "Delete notifications",
  "support.read": "View support conversations",
  "support.create": "Create support conversations",
  "support.update": "Reply to and update support conversations",
  "audit.read": "View business audit logs",
  "tenant.manage": "Manage tenant settings",
  "billing.manage": "Manage billing and subscription",
  "settings.read": "View organization settings, plan and usage",
  "settings.manage": "Change organization settings and branding",
};

