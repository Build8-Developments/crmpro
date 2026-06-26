export const PERMISSIONS = {
  LEAD_CREATE: 'lead.create',
  LEAD_READ: 'lead.read',
  LEAD_UPDATE: 'lead.update',
  LEAD_DELETE: 'lead.delete',
  LEAD_ASSIGN: 'lead.assign',

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

  ROLE_CREATE: 'role.create',
  ROLE_READ: 'role.read',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',

  FILE_UPLOAD: 'file.upload',
  FILE_READ: 'file.read',
  FILE_DELETE: 'file.delete',

  TENANT_MANAGE: 'tenant.manage',
  BILLING_MANAGE: 'billing.manage',
} as const;

export type PermissionKey =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_GROUPS = {
  LEADS: [
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_READ,
    PERMISSIONS.LEAD_UPDATE,
    PERMISSIONS.LEAD_DELETE,
    PERMISSIONS.LEAD_ASSIGN,
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
  ],
  ROLES: [
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_READ,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.ROLE_DELETE,
  ],
  FILES: [
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.FILE_READ,
    PERMISSIONS.FILE_DELETE,
  ],
  TENANT: [PERMISSIONS.TENANT_MANAGE, PERMISSIONS.BILLING_MANAGE],
} as const satisfies Record<string, readonly PermissionKey[]>;

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS;

/** Display labels for role-editor section headers. */
export const PERMISSION_GROUP_LABELS: Record<PermissionGroupKey, string> = {
  LEADS: 'Leads',
  PROJECTS: 'Projects',
  PIPELINES: 'Pipelines',
  USERS: 'Users',
  ROLES: 'Roles',
  FILES: 'Files',
  TENANT: 'Organization',
};

/** Stable UI iteration order for permission groups. */
export const PERMISSION_GROUP_ORDER = [
  'LEADS',
  'PROJECTS',
  'PIPELINES',
  'USERS',
  'ROLES',
  'FILES',
  'TENANT',
] as const satisfies readonly PermissionGroupKey[];
