export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDetail extends Role {
  permissionKeys: string[];
}

export interface CreateRoleInput {
  name: string;
  description?: string;
}

export interface UpdateRoleInput {
  name: string;
}

export interface UpdateRolePermissionsInput {
  permissionKeys: string[];
}
