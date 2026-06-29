import { SetMetadata } from '@nestjs/common';
import type { AdminPermissionKey } from '@crmpro/shared';
import { ADMIN_PERMISSIONS_METADATA_KEY } from '../constants';

export const RequireAdminPermission = (...permissions: AdminPermissionKey[]) =>
  SetMetadata(ADMIN_PERMISSIONS_METADATA_KEY, permissions);
