import { ForbiddenException } from '@nestjs/common';

export class TenantInactiveException extends ForbiddenException {
  readonly tenantInactive = true as const;

  constructor(message = 'Tenant is inactive.') {
    super(message);
  }
}
