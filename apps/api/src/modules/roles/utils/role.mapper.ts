import type { PermissionKey } from '@crmpro/shared/auth';
import type { RoleDetail, RoleListItem } from '../types/role.types';

type RoleCounts = {
  permissionCount: number;
  userCount: number;
};

type RoleRecord = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function toRoleListItem(
  role: RoleRecord,
  counts: RoleCounts,
): RoleListItem {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    permissionCount: counts.permissionCount,
    userCount: counts.userCount,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

export function toRoleDetail(
  role: RoleRecord,
  counts: RoleCounts,
  permissionKeys: PermissionKey[],
): RoleDetail {
  return {
    ...toRoleListItem(role, counts),
    permissionKeys,
  };
}
