export {
  TENANT_ROLE_NAMES,
  DEFAULT_TENANT_ROLES,
  OWNER_PERMISSION_KEYS,
  MANAGER_PERMISSION_KEYS,
  AGENT_PERMISSION_KEYS,
  DEFAULT_LEAD_SOURCES,
  DEFAULT_PIPELINE,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_LOST_REASONS,
  type LostReasonDefinition,
} from './tenant-bootstrap.constants';

export type {
  TenantRoleDefinition,
  PipelineStageDefinition,
  TenantRolePermissionMap,
} from './tenant-bootstrap.types';
