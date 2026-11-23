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

/** How long a tenant's read-only state is cached per process. */
export const TENANT_ACCESS_STATE_CACHE_TTL_MS = 15_000;

const readOnlyDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function tenantReadOnlyMessage(accessEndsAt: Date | null): string {
  const until = accessEndsAt
    ? ` until ${readOnlyDateFormatter.format(accessEndsAt)}`
    : '';
  return `This workspace is read-only${until} because its contract ended. You can still view and export your data.`;
}
