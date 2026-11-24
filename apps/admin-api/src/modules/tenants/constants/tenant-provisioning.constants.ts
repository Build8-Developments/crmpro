export {
  AGENT_PERMISSION_KEYS,
  DEFAULT_LEAD_SOURCES,
  DEFAULT_PIPELINE,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_TENANT_ROLES,
  MANAGER_PERMISSION_KEYS,
  OWNER_PERMISSION_KEYS,
  TENANT_ROLE_NAMES,
} from '@crmpro/shared/bootstrap';

/**
 * A workspace's slug is also its host: `<prefix>-<suffix>.nomow.app`. The
 * admin picks the prefix; the suffix is random so hosts are unique and hard
 * to guess. Slugs never change after creation.
 */
export {
  RESERVED_WORKSPACE_PREFIXES,
  WORKSPACE_PREFIX_MAX_LENGTH,
  WORKSPACE_SLUG_PATTERN as SLUG_PATTERN,
  WORKSPACE_SUFFIX_ALPHABET,
  WORKSPACE_SUFFIX_LENGTH,
  generateWorkspaceSlug,
} from '@crmpro/shared/workspaces';

/** @deprecated Use DEFAULT_TENANT_ROLES from @crmpro/shared/bootstrap */
export { DEFAULT_TENANT_ROLES as TENANT_ROLE_DEFINITIONS } from '@crmpro/shared/bootstrap';

/** @deprecated Use DEFAULT_LEAD_SOURCES from @crmpro/shared/bootstrap */
export { DEFAULT_LEAD_SOURCES as DEFAULT_LEAD_SOURCE_NAMES } from '@crmpro/shared/bootstrap';

/** @deprecated Use OWNER_PERMISSION_KEYS from @crmpro/shared/bootstrap */
export { OWNER_PERMISSION_KEYS as ALL_TENANT_PERMISSION_KEYS } from '@crmpro/shared/bootstrap';
