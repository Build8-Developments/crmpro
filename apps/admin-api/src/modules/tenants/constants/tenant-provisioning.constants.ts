import { PERMISSIONS } from '@crmpro/shared';
import { PipelineCloseType } from '@crmpro/database';

export const TENANT_ROLE_NAMES = {
  owner: 'Owner',
  manager: 'Manager',
  agent: 'Agent',
} as const;

export const TENANT_ROLE_DEFINITIONS = [
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

/** Mirrors CRM seed agent role permissions. */
export const AGENT_PERMISSION_KEYS = [
  'lead.read',
  'lead.create',
  'lead.update',
  'lead.assign',
  'lead-note.create',
  'lead-note.read',
  'lead-note.update',
  'lead-note.delete',
  'lead-source.read',
  'developer.read',
  'project.read',
  'pipeline.read',
  'file.upload',
  'file.read',
  'import-job.read',
  'export-job.read',
  'analytics.read',
  'notification.read',
  'notification.update',
] as const;

export const ALL_TENANT_PERMISSION_KEYS = Object.values(PERMISSIONS);

export const MANAGER_PERMISSION_KEYS = ALL_TENANT_PERMISSION_KEYS.filter(
  (key) => key !== PERMISSIONS.BILLING_MANAGE && key !== PERMISSIONS.NOTIFICATION_DELETE,
);

export const DEFAULT_LEAD_SOURCE_NAMES = [
  'Manual',
  'Website',
  'Facebook Ads',
  'Referral',
] as const;

export const DEFAULT_PIPELINE_NAME = 'Default Sales Pipeline';

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New Lead', color: '#94a3b8', isClosed: false, closeType: null },
  { name: 'Contacted', color: '#60a5fa', isClosed: false, closeType: null },
  { name: 'Qualified', color: '#818cf8', isClosed: false, closeType: null },
  { name: 'Proposal Sent', color: '#a78bfa', isClosed: false, closeType: null },
  { name: 'Negotiation', color: '#f59e0b', isClosed: false, closeType: null },
  {
    name: 'Won',
    color: '#22c55e',
    isClosed: true,
    closeType: PipelineCloseType.WON,
  },
  {
    name: 'Lost',
    color: '#ef4444',
    isClosed: true,
    closeType: PipelineCloseType.LOST,
  },
] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
