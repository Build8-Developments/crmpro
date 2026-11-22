import { TenantStatus } from '@crmpro/database';

// TRIAL is the schema default, so tenants created outside provisioning land there.
export const ACCESSIBLE_TENANT_STATUSES: ReadonlySet<TenantStatus> = new Set([
  TenantStatus.ACTIVE,
  TenantStatus.TRIAL,
]);

export const TENANT_ACCESS_MESSAGES = {
  SUSPENDED: 'Tenant account is suspended.',
  INACTIVE: 'Tenant account is inactive.',
  CONTRACT_LAPSED:
    'Tenant subscription has ended. Access is no longer available.',
} as const;
