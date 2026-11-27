import { ForbiddenException } from '@nestjs/common';
import type { PermissionKey } from '@crmpro/shared/auth';

function assertPermissionSubset(
  actorPermissionKeys: Set<PermissionKey>,
  targetPermissionKeys: PermissionKey[],
  message: string,
): void {
  for (const permission of targetPermissionKeys) {
    if (!actorPermissionKeys.has(permission)) {
      throw new ForbiddenException(message);
    }
  }
}

export function assertCanGrantPermissions(
  actorPermissionKeys: Set<PermissionKey>,
  targetPermissionKeys: PermissionKey[],
): void {
  assertPermissionSubset(
    actorPermissionKeys,
    targetPermissionKeys,
    'Cannot grant permissions you do not have',
  );
}

export function assertActorCanManageUser(
  actorPermissionKeys: Set<PermissionKey>,
  targetPermissionKeys: PermissionKey[],
): void {
  assertPermissionSubset(
    actorPermissionKeys,
    targetPermissionKeys,
    'Cannot manage a user who has permissions you do not have',
  );
}

export function assertActorCanAssignRole(
  actorPermissionKeys: Set<PermissionKey>,
  targetRolePermissionKeys: PermissionKey[],
): void {
  assertPermissionSubset(
    actorPermissionKeys,
    targetRolePermissionKeys,
    'Cannot assign a role with permissions you do not have',
  );
}
