import { ForbiddenException } from '@nestjs/common';
import type { PermissionKey } from '@crmpro/shared/auth';

export function assertCanGrantPermissions(
  actorPermissionKeys: Set<PermissionKey>,
  targetPermissionKeys: PermissionKey[],
): void {
  for (const permission of targetPermissionKeys) {
    if (!actorPermissionKeys.has(permission)) {
      throw new ForbiddenException(
        'Cannot grant permissions you do not have',
      );
    }
  }
}
