import type { PermissionKey } from '@crmpro/shared/auth';
import type { Prisma } from '@crmpro/database';
import type { UserDetail, UserListItem } from '../types/user.types';

const userListSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
  team: { select: { id: true, name: true } },
  invitedAt: true,
  inviteAcceptedAt: true,
} satisfies Prisma.UserSelect;

export type UserListRecord = Prisma.UserGetPayload<{
  select: typeof userListSelect;
}>;

export const userListSelectClause = userListSelect;

export function toUserListItem(user: UserListRecord): UserListItem {
  return {
    id: user.id,
    fullName: user.name,
    email: user.email,
    phone: user.phone,
    isActive: user.isActive,
    role: user.role,
    team: user.team,
    invitationPending: Boolean(user.invitedAt && !user.inviteAcceptedAt),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toUserDetail(
  user: UserListRecord,
  permissions: PermissionKey[],
  activeSessionCount: number,
): UserDetail {
  return {
    ...toUserListItem(user),
    permissions,
    activeSessionCount,
  };
}
