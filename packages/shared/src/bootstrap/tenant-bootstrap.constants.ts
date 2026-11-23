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
      key !== PERMISSIONS.SETTINGS_MANAGE &&
      key !== PERMISSIONS.SPEND_MANAGE &&
      key !== PERMISSIONS.NOTIFICATION_DELETE &&
      key !== PERMISSIONS.USER_MANAGE &&
      key !== PERMISSIONS.ROLE_MANAGE &&
      // Managers distribute leads across the whole organization, so they keep
      // lead.read-all; team scope is for custom roles such as a team leader.
      key !== PERMISSIONS.LEAD_READ_TEAM,
  );

export const AGENT_PERMISSION_KEYS: readonly PermissionKey[] = [
  PERMISSIONS.LEAD_READ,
  PERMISSIONS.LEAD_CREATE,
  PERMISSIONS.LEAD_UPDATE,
  // No LEAD_ASSIGN / LEAD_MERGE: assignment, transfers and merging duplicates
  // are the sales manager's job.
  // No lead.read-team / lead.read-all: agents see their own leads plus the
  // unassigned pool.
  // Agents record the deal on the leads they win; cancelling is a manager's
  // call (it re-opens the lead).
  PERMISSIONS.DEAL_READ,
  PERMISSIONS.DEAL_WRITE,
  PERMISSIONS.TARGET_READ,
  PERMISSIONS.LEAD_NOTE_CREATE,
  PERMISSIONS.LEAD_NOTE_READ,
  PERMISSIONS.LEAD_NOTE_UPDATE,
  PERMISSIONS.LEAD_NOTE_DELETE,
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

export interface LostReasonDefinition {
  name: string;
  /** Recyclable reasons bring the lead back as a re-engage task later. */
  recyclable: boolean;
  recycleAfterDays: number | null;
}

/** Same list as the backfill in migration 20261117100000_workflow_records. */
export const DEFAULT_LOST_REASONS: readonly LostReasonDefinition[] = [
  { name: 'Budget too low', recyclable: true, recycleAfterDays: 120 },
  { name: 'Bought elsewhere', recyclable: false, recycleAfterDays: null },
  { name: 'Postponed decision', recyclable: true, recycleAfterDays: 90 },
  { name: 'Unreachable', recyclable: true, recycleAfterDays: 60 },
  { name: 'Wants ready-to-move', recyclable: true, recycleAfterDays: 180 },
  { name: 'Location not suitable', recyclable: false, recycleAfterDays: null },
  { name: 'Payment plan not suitable', recyclable: true, recycleAfterDays: 120 },
  { name: 'Fake or duplicate lead', recyclable: false, recycleAfterDays: null },
] as const;

export const DEFAULT_PIPELINE = {
  name: 'Default Sales Pipeline',
  isDefault: true,
} as const;

export const DEFAULT_PIPELINE_STAGES: readonly PipelineStageDefinition[] = [
  { name: 'New Lead', color: '#94a3b8', icon: 'sparkles', isClosed: false, closeType: null, staleAfterDays: 3, stuckAfterDays: null },
  { name: 'Contacted', color: '#60a5fa', icon: 'phone', isClosed: false, closeType: null, staleAfterDays: 7, stuckAfterDays: 14 },
  { name: 'Qualified', color: '#818cf8', icon: 'circle-check', isClosed: false, closeType: null, staleAfterDays: 7, stuckAfterDays: 21 },
  { name: 'Proposal', color: '#a78bfa', icon: 'file-text', isClosed: false, closeType: null, staleAfterDays: 5, stuckAfterDays: 14 },
  { name: 'Negotiation', color: '#f59e0b', icon: 'handshake', isClosed: false, closeType: null, staleAfterDays: 5, stuckAfterDays: 21 },
  {
    name: 'Won',
    color: '#22c55e',
    icon: 'trophy',
    isClosed: true,
    closeType: 'WON',
    staleAfterDays: null,
    stuckAfterDays: null,
  },
  {
    name: 'Lost',
    color: '#ef4444',
    icon: 'circle-x',
    isClosed: true,
    closeType: 'LOST',
    staleAfterDays: null,
    stuckAfterDays: null,
  },
] as const;
