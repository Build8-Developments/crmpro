export const PERMISSION_GROUPS = {
  LEADS: [
    "lead.create",
    "lead.read",
    "lead.update",
    "lead.delete",
    "lead.assign",
    "lead.read-team",
    "lead.read-all",
  ],
  LEAD_NOTES: [
    "lead-note.create",
    "lead-note.read",
    "lead-note.update",
    "lead-note.delete",
  ],
  LEAD_ACTIVITIES: ["lead-activity.create"],
  TASKS: ["task.read", "task.create", "task.update", "task.delete"],
  LEAD_SOURCES: [
    "lead-source.create",
    "lead-source.read",
    "lead-source.update",
    "lead-source.delete",
  ],
  DEVELOPERS: [
    "developer.create",
    "developer.read",
    "developer.update",
    "developer.delete",
  ],
  PROJECTS: [
    "project.create",
    "project.read",
    "project.update",
    "project.delete",
  ],
  PIPELINES: [
    "pipeline.create",
    "pipeline.read",
    "pipeline.update",
    "pipeline.delete",
  ],
  USERS: [
    "user.create",
    "user.read",
    "user.update",
    "user.delete",
    "user.manage",
  ],
  TEAMS: ["team.read", "team.manage"],
  ROLES: [
    "role.create",
    "role.read",
    "role.update",
    "role.delete",
    "role.manage",
  ],
  FILES: ["file.upload", "file.read", "file.delete"],
  IMPORT_JOBS: ["import-job.create", "import-job.read"],
  EXPORT_JOBS: ["export-job.create", "export-job.read"],
  ANALYTICS: ["analytics.read"],
  NOTIFICATIONS: [
    "notification.read",
    "notification.update",
    "notification.delete",
  ],
  AUDIT: ["audit.read"],
  TENANT: ["tenant.manage", "billing.manage", "api-key.manage"],
} as const;

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS;

export const PERMISSION_GROUP_LABELS: Record<PermissionGroupKey, string> = {
  LEADS: "Leads",
  LEAD_NOTES: "Lead Notes",
  LEAD_ACTIVITIES: "Lead Activities",
  TASKS: "Follow-ups",
  LEAD_SOURCES: "Lead Sources",
  DEVELOPERS: "Developers",
  PROJECTS: "Projects",
  PIPELINES: "Pipelines",
  USERS: "Users",
  TEAMS: "Teams",
  ROLES: "Roles",
  FILES: "Files",
  IMPORT_JOBS: "Import Jobs",
  EXPORT_JOBS: "Export Jobs",
  ANALYTICS: "Analytics",
  NOTIFICATIONS: "Notifications",
  AUDIT: "Audit",
  TENANT: "Organization",
};

export const PERMISSION_GROUP_ORDER: PermissionGroupKey[] = [
  "LEADS",
  "LEAD_NOTES",
  "LEAD_ACTIVITIES",
  "TASKS",
  "LEAD_SOURCES",
  "DEVELOPERS",
  "PROJECTS",
  "PIPELINES",
  "USERS",
  "TEAMS",
  "ROLES",
  "FILES",
  "IMPORT_JOBS",
  "EXPORT_JOBS",
  "ANALYTICS",
  "NOTIFICATIONS",
  "AUDIT",
  "TENANT",
];

const ACTION_LABELS: Record<string, string> = {
  create: "Create",
  read: "View",
  update: "Edit",
  delete: "Delete",
  assign: "Assign",
  manage: "Manage",
  "read-team": "View team's",
  "read-all": "View all",
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
  "lead.read-team":
    "See leads of their team(s) and unassigned leads (without this or 'View all', users only see leads assigned to them)",
  "lead.read-all": "See every lead in the organization",
  "team.read": "View teams",
  "team.manage": "Create teams and manage membership",
  "lead-note.create": "Create lead notes",
  "lead-note.read": "View lead notes",
  "lead-note.update": "Update lead notes",
  "lead-note.delete": "Delete lead notes",
  "lead-activity.create": "Log calls, WhatsApp, emails, meetings and visits",
  "task.read": "View follow-ups",
  "task.create": "Schedule follow-ups",
  "task.update": "Update and complete follow-ups",
  "task.delete": "Delete follow-ups",
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
  "api-key.manage": "Create and revoke inbound API keys",
};

