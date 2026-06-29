import { SetMetadata } from '@nestjs/common';
import type { AdminPermissionKey } from '@crmpro/shared';
import { ADMIN_ANY_PERMISSIONS_METADATA_KEY } from '../constants';

export const RequireAnyAdminPermission = (
  ...permissions: AdminPermissionKey[]
) => SetMetadata(ADMIN_ANY_PERMISSIONS_METADATA_KEY, permissions);
