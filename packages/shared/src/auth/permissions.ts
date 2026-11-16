export const PERMISSIONS = {
  LEAD_CREATE: 'lead.create',
  LEAD_READ: 'lead.read',
  LEAD_UPDATE: 'lead.update',
  LEAD_DELETE: 'lead.delete',
  LEAD_ASSIGN: 'lead.assign',

  LEAD_NOTE_CREATE: 'lead-note.create',
  LEAD_NOTE_READ: 'lead-note.read',
  LEAD_NOTE_UPDATE: 'lead-note.update',
  LEAD_NOTE_DELETE: 'lead-note.delete',

  LEAD_SOURCE_CREATE: 'lead-source.create',
  LEAD_SOURCE_READ: 'lead-source.read',
  LEAD_SOURCE_UPDATE: 'lead-source.update',
  LEAD_SOURCE_DELETE: 'lead-source.delete',

  DEVELOPER_CREATE: 'developer.create',
  DEVELOPER_READ: 'developer.read',
  DEVELOPER_UPDATE: 'developer.update',
  DEVELOPER_DELETE: 'developer.delete',

  PROJECT_CREATE: 'project.create',
  PROJECT_READ: 'project.read',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',

  PIPELINE_CREATE: 'pipeline.create',
  PIPELINE_READ: 'pipeline.read',
  PIPELINE_UPDATE: 'pipeline.update',
  PIPELINE_DELETE: 'pipeline.delete',

  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_MANAGE: 'user.manage',

  ROLE_CREATE: 'role.create',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',
  ROLE_MANAGE: 'role.manage',

  FILE_UPLOAD: 'file.upload',
  FILE_READ: 'file.read',
  FILE_DELETE: 'file.delete',
  FILE_MANAGE: 'file.manage',

  IMPORT_JOB_CREATE: 'import-job.create',
  IMPORT_JOB_READ: 'import-job.read',

  EXPORT_JOB_CREATE: 'export-job.create',
  EXPORT_JOB_READ: 'export-job.read',

  ANALYTICS_READ: 'analytics.read',

  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_UPDATE: 'notification.update',
  NOTIFICATION_DELETE: 'notification.delete',

  SUPPORT_READ: 'support.read',
  SUPPORT_CREATE: 'support.create',
  SUPPORT_UPDATE: 'support.update',

  AUDIT_READ: 'audit.read',

  TENANT_MANAGE: 'tenant.manage',
  BILLING_MANAGE: 'billing.manage',

  SETTINGS_READ: 'settings.read',
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export const ADMIN_PERMISSIONS = {
  ADMIN_MANAGE: 'admin.manage',

  TENANT_READ: 'tenant.read',
  TENANT_CREATE: 'tenant.create',
  TENANT_UPDATE: 'tenant.update',
  TENANT_SUSPEND: 'tenant.suspend',

  PLAN_READ: 'plan.read',
  PLAN_CREATE: 'plan.create',
  PLAN_UPDATE: 'plan.update',
  PLAN_DELETE: 'plan.delete',

  CONTRACT_READ: 'contract.read',
  CONTRACT_CREATE: 'contract.create',
  CONTRACT_UPDATE: 'contract.update',
  CONTRACT_TERMINATE: 'contract.terminate',

  PLATFORM_ANALYTICS_READ: 'platform-analytics.read',
  AUDIT_READ: 'audit.read',
  SUPPORT_ACCESS: 'support.access',
} as const;

export type PermissionKey =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type AdminPermissionKey =
  (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

export const PERMISSION_GROUPS = {
  LEADS: [
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_READ,
    PERMISSIONS.LEAD_UPDATE,
    PERMISSIONS.LEAD_DELETE,
    PERMISSIONS.LEAD_ASSIGN,
  ],
  LEAD_NOTES: [
    PERMISSIONS.LEAD_NOTE_CREATE,
    PERMISSIONS.LEAD_NOTE_READ,
    PERMISSIONS.LEAD_NOTE_UPDATE,
    PERMISSIONS.LEAD_NOTE_DELETE,
  ],
  LEAD_SOURCES: [
    PERMISSIONS.LEAD_SOURCE_CREATE,
    PERMISSIONS.LEAD_SOURCE_READ,
    PERMISSIONS.LEAD_SOURCE_UPDATE,
    PERMISSIONS.LEAD_SOURCE_DELETE,
  ],
  DEVELOPERS: [
    PERMISSIONS.DEVELOPER_CREATE,
    PERMISSIONS.DEVELOPER_READ,
    PERMISSIONS.DEVELOPER_UPDATE,
    PERMISSIONS.DEVELOPER_DELETE,
  ],
  PROJECTS: [
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.PROJECT_DELETE,
  ],
  PIPELINES: [
    PERMISSIONS.PIPELINE_CREATE,
    PERMISSIONS.PIPELINE_READ,
    PERMISSIONS.PIPELINE_UPDATE,
    PERMISSIONS.PIPELINE_DELETE,
  ],
  USERS: [
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_MANAGE,
  ],
  ROLES: [
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_READ,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.ROLE_DELETE,
    PERMISSIONS.ROLE_MANAGE,
  ],
  FILES: [
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.FILE_READ,
    PERMISSIONS.FILE_DELETE,
    PERMISSIONS.FILE_MANAGE,
  ],
  IMPORT_JOBS: [
    PERMISSIONS.IMPORT_JOB_CREATE,
    PERMISSIONS.IMPORT_JOB_READ,
  ],
  EXPORT_JOBS: [
    PERMISSIONS.EXPORT_JOB_CREATE,
    PERMISSIONS.EXPORT_JOB_READ,
  ],
  ANALYTICS: [PERMISSIONS.ANALYTICS_READ],
  NOTIFICATIONS: [
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.NOTIFICATION_UPDATE,
    PERMISSIONS.NOTIFICATION_DELETE,
  ],
  SUPPORT: [
    PERMISSIONS.SUPPORT_READ,
    PERMISSIONS.SUPPORT_CREATE,
    PERMISSIONS.SUPPORT_UPDATE,
  ],
  AUDIT: [PERMISSIONS.AUDIT_READ],
  TENANT: [PERMISSIONS.TENANT_MANAGE, PERMISSIONS.BILLING_MANAGE],
  SETTINGS: [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_MANAGE],
} as const satisfies Record<string, readonly PermissionKey[]>;

export const ADMIN_PERMISSION_GROUPS = {
  ADMIN_PLATFORM: [
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.TENANT_READ,
    ADMIN_PERMISSIONS.TENANT_CREATE,
    ADMIN_PERMISSIONS.TENANT_UPDATE,
    ADMIN_PERMISSIONS.TENANT_SUSPEND,
    ADMIN_PERMISSIONS.PLAN_READ,
    ADMIN_PERMISSIONS.PLAN_CREATE,
    ADMIN_PERMISSIONS.PLAN_UPDATE,
    ADMIN_PERMISSIONS.PLAN_DELETE,
    ADMIN_PERMISSIONS.PLATFORM_ANALYTICS_READ,
    ADMIN_PERMISSIONS.AUDIT_READ,
    ADMIN_PERMISSIONS.SUPPORT_ACCESS,
  ],
  CONTRACTS: [
    ADMIN_PERMISSIONS.CONTRACT_READ,
    ADMIN_PERMISSIONS.CONTRACT_CREATE,
    ADMIN_PERMISSIONS.CONTRACT_UPDATE,
    ADMIN_PERMISSIONS.CONTRACT_TERMINATE,
  ],
} as const satisfies Record<string, readonly AdminPermissionKey[]>;

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS;

/** Display labels for role-editor section headers. */
export const PERMISSION_GROUP_LABELS: Record<PermissionGroupKey, string> = {
  LEADS: 'Leads',
  LEAD_NOTES: 'Lead Notes',
  LEAD_SOURCES: 'Lead Sources',
  DEVELOPERS: 'Developers',
  PROJECTS: 'Projects',
  PIPELINES: 'Pipelines',
  USERS: 'Users',
  ROLES: 'Roles',
  FILES: 'Files',
  IMPORT_JOBS: 'Import Jobs',
  EXPORT_JOBS: 'Export Jobs',
  ANALYTICS: 'Analytics',
  NOTIFICATIONS: 'Notifications',
  SUPPORT: 'Support',
  AUDIT: 'Audit',
  TENANT: 'Organization',
  SETTINGS: 'Organization Settings',
};

export type AdminPermissionGroupKey = keyof typeof ADMIN_PERMISSION_GROUPS;

/** Display labels for admin role-editor section headers. */
export const ADMIN_PERMISSION_GROUP_LABELS: Record<
  AdminPermissionGroupKey,
  string
> = {
  ADMIN_PLATFORM: 'Platform Admin',
  CONTRACTS: 'Contracts',
};

/** Stable UI iteration order for admin permission groups. */
export const ADMIN_PERMISSION_GROUP_ORDER = [
  'ADMIN_PLATFORM',
  'CONTRACTS',
] as const satisfies readonly AdminPermissionGroupKey[];

/** Stable UI iteration order for permission groups. */
export const PERMISSION_GROUP_ORDER = [
  'LEADS',
  'LEAD_NOTES',
  'LEAD_SOURCES',
  'DEVELOPERS',
  'PROJECTS',
  'PIPELINES',
  'USERS',
  'ROLES',
  'FILES',
  'IMPORT_JOBS',
  'EXPORT_JOBS',
  'ANALYTICS',
  'NOTIFICATIONS',
  'SUPPORT',
  'AUDIT',
  'TENANT',
] as const satisfies readonly PermissionGroupKey[];
