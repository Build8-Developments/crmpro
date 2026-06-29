import type { TenantStatus } from '@crmpro/database';

export type TenantAccessRecord = {
  id: string;
  status: TenantStatus;
};
