import type { PermissionKey } from '@crmpro/shared/auth';

export type UserRoleSummary = {
  id: string;
  name: string;
};

export type UserListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  role: UserRoleSummary;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserDetail = UserListItem & {
  permissions: PermissionKey[];
  activeSessionCount: number;
};
