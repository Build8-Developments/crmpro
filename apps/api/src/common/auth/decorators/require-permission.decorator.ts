import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@crmpro/shared/auth';
import { PERMISSIONS_METADATA_KEY } from '../constants';

export const RequirePermission = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_METADATA_KEY, permissions);
