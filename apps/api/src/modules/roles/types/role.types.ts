import type { PermissionKey } from '@crmpro/shared/auth';

export type RoleListItem = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type RoleDetail = RoleListItem & {
  permissionKeys: PermissionKey[];
};
