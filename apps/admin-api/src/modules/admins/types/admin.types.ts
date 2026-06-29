export interface AdminRoleSummary {
  id: string;
  name: string;
  isSystem: boolean;
}

export interface AdminPermissionSummary {
  id: string;
  key: string;
  description: string | null;
}

export interface AdminListItem {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminDetail {
  id: string;
  email: string;
  fullName: string;
  role: AdminRoleSummary;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  activeSessionsCount: number;
}

export interface AdminRoleDetail extends AdminRoleSummary {
  permissions: AdminPermissionSummary[];
}

export interface AdminNoteAuthor {
  id: string;
  fullName: string;
  email: string;
}

export interface AdminNoteItem {
  id: string;
  content: string;
  author: AdminNoteAuthor;
  createdAt: Date;
  updatedAt: Date;
}
