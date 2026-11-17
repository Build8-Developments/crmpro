import { PERMISSIONS, type PermissionKey } from '../auth/permissions';
import type {
  PipelineStageDefinition,
  TenantRoleDefinition,
} from './tenant-bootstrap.types';

export const TENANT_ROLE_NAMES = {
  owner: 'Owner',
  manager: 'Manager',
  agent: 'Agent',
} as const;

export const DEFAULT_TENANT_ROLES: readonly TenantRoleDefinition[] = [
  {
    name: TENANT_ROLE_NAMES.owner,
    description: 'Full access to all tenant features and settings.',
  },
  {
    name: TENANT_ROLE_NAMES.manager,
    description: 'Manages team operations without billing access.',
  },
  {
    name: TENANT_ROLE_NAMES.agent,
    description: 'Day-to-day sales work on leads and projects.',
  },
] as const;

const ALL_TENANT_PERMISSION_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

export const OWNER_PERMISSION_KEYS: readonly PermissionKey[] =
  ALL_TENANT_PERMISSION_KEYS;

export const MANAGER_PERMISSION_KEYS: readonly PermissionKey[] =
  ALL_TENANT_PERMISSION_KEYS.filter(
    (key) =>
      key !== PERMISSIONS.BILLING_MANAGE &&
      key !== PERMISSIONS.NOTIFICATION_DELETE &&
      key !== PERMISSIONS.USER_MANAGE &&
      key !== PERMISSIONS.ROLE_MANAGE &&
      // Managers see their team's leads, not the whole tenant.
      key !== PERMISSIONS.LEAD_READ_ALL,
  );

export const AGENT_PERMISSION_KEYS: readonly PermissionKey[] = [
  PERMISSIONS.LEAD_READ,
  PERMISSIONS.LEAD_CREATE,
  PERMISSIONS.LEAD_UPDATE,
  // No LEAD_ASSIGN and no LEAD_READ_TEAM / LEAD_READ_ALL: agents only see and
  // work the leads assigned to them; managers distribute.
  PERMISSIONS.LEAD_NOTE_CREATE,
  PERMISSIONS.LEAD_NOTE_READ,
  PERMISSIONS.LEAD_NOTE_UPDATE,
  PERMISSIONS.LEAD_NOTE_DELETE,
  PERMISSIONS.LEAD_ACTIVITY_CREATE,
  PERMISSIONS.TASK_READ,
  PERMISSIONS.TASK_CREATE,
  PERMISSIONS.TASK_UPDATE,
  PERMISSIONS.LEAD_SOURCE_READ,
  PERMISSIONS.DEVELOPER_READ,
  PERMISSIONS.PROJECT_READ,
  PERMISSIONS.PIPELINE_READ,
  PERMISSIONS.FILE_UPLOAD,
  PERMISSIONS.FILE_READ,
  PERMISSIONS.IMPORT_JOB_READ,
  PERMISSIONS.EXPORT_JOB_READ,
  PERMISSIONS.ANALYTICS_READ,
  PERMISSIONS.NOTIFICATION_READ,
  PERMISSIONS.NOTIFICATION_UPDATE,
  PERMISSIONS.SUPPORT_READ,
  PERMISSIONS.SUPPORT_CREATE,
  PERMISSIONS.SUPPORT_UPDATE,
] as const;

export const DEFAULT_LEAD_SOURCES = [
  'Manual',
  'Website',
  'Facebook Ads',
  'Referral',
] as const;

export const DEFAULT_PIPELINE = {
  name: 'Default Sales Pipeline',
  isDefault: true,
} as const;

export const DEFAULT_PIPELINE_STAGES: readonly PipelineStageDefinition[] = [
  { name: 'New Lead', color: '#94a3b8', isClosed: false, closeType: null },
  { name: 'Contacted', color: '#60a5fa', isClosed: false, closeType: null },
  { name: 'Qualified', color: '#818cf8', isClosed: false, closeType: null },
  { name: 'Proposal', color: '#a78bfa', isClosed: false, closeType: null },
  { name: 'Negotiation', color: '#f59e0b', isClosed: false, closeType: null },
  {
    name: 'Won',
    color: '#22c55e',
    isClosed: true,
    closeType: 'WON',
  },
  {
    name: 'Lost',
    color: '#ef4444',
    isClosed: true,
    closeType: 'LOST',
  },
] as const;
