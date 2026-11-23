import { ForbiddenException } from '@nestjs/common';
import { API_ERROR_CODES } from '@crmpro/shared';
import { tenantReadOnlyMessage } from './tenant-access.constants';

export class TenantInactiveException extends ForbiddenException {
  readonly tenantInactive = true as const;

  constructor(message = 'Tenant is inactive.') {
    super(message);
  }
}

/** 403 TENANT_READ_ONLY: a write while the contract winds down read-only. */
export class TenantReadOnlyException extends ForbiddenException {
  constructor(accessEndsAt: Date | null) {
    super({
      code: API_ERROR_CODES.TENANT_READ_ONLY,
      message: tenantReadOnlyMessage(accessEndsAt),
      details: { accessEndsAt: accessEndsAt?.toISOString() ?? null },
    });
  }
}
