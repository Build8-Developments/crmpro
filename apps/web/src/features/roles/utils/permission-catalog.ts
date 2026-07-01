export const PERMISSION_GROUPS = {
  LEADS: [
    "lead.create",
    "lead.read",
    "lead.update",
    "lead.delete",
    "lead.assign",
  ],
  LEAD_NOTES: [
    "lead-note.create",
    "lead-note.read",
    "lead-note.update",
    "lead-note.delete",
  ],
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
  TENANT: ["tenant.manage", "billing.manage"],
} as const;

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS;

export const PERMISSION_GROUP_LABELS: Record<PermissionGroupKey, string> = {
  LEADS: "Leads",
  LEAD_NOTES: "Lead Notes",
  LEAD_SOURCES: "Lead Sources",
  DEVELOPERS: "Developers",
  PROJECTS: "Projects",
  PIPELINES: "Pipelines",
  USERS: "Users",
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
  "LEAD_SOURCES",
  "DEVELOPERS",
  "PROJECTS",
  "PIPELINES",
  "USERS",
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
